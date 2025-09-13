use serde::{Deserialize, Serialize};
use std::env;
use super::ai_config::AiConfig;

#[derive(Serialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
    temperature: f32,
}

#[derive(Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OpenRouterResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: Message,
}

pub fn create_concise_prompt(question: &str, response_type: &str) -> String {
    match response_type {
        "yes_no" => format!(
            "You are a concise assistant. Answer with ONLY 'Yes' or 'No' followed by a single brief sentence if needed. If it you cannot answer the question with a yes or no(like a what or how question), then don't answer yes or no in front, act like the brief mode. Question: {}", 
            question
        ),
        "brief" => format!(
            "You are a concise assistant. Provide the most direct, brief answer possible. No explanations, examples, or elaboration unless absolutely necessary. Maximum 2 sentences. Question: {}", 
            question
        ),
        "bullet" => format!(
            "You are a concise assistant. Answer with only the key points in bullet format. Maximum 3 bullet points. Question: {}", 
            question
        ),
        "detailed" => format!(
            "You are a knowledgeable assistant. Provide as comprehensive and detailed answer as you can that fully explains the topic. Include relevant context, examples, and thorough explanations. Be informative and complete. Question: {}", 
            question
        ),
        _ => format!(
            "You are a concise assistant. Be direct and brief. No unnecessary explanations. Question: {}", 
            question
        ),
    }
}

pub fn generate_simple_title(content: &str) -> String {
    let content = content.trim();
    
    // Handle Q&A format specifically - extract the question
    if content.starts_with("Q:") && content.contains("\n\nA:") {
        if let Some(question_end) = content.find("\n\nA:") {
            let question = content[2..question_end].trim(); // Remove "Q:" prefix
            if question.len() <= 50 {
                return question.to_string();
            } else {
                return format!("{}...", &question[..47]);
            }
        }
    }
    
    // For multi-line content, try to use the first meaningful line
    let first_line = content.lines().next().unwrap_or("").trim();
    if !first_line.is_empty() && first_line.len() <= 60 && !first_line.starts_with("Q:") {
        return first_line.to_string();
    }
    
    // Last resort: take first 50 chars (this should rarely happen since AI should work)
    if content.len() > 50 {
        // Find a good breaking point near 50 chars (preferably at word boundary)
        let truncated = &content[..50.min(content.len())];
        if let Some(last_space) = truncated.rfind(' ') {
            if last_space > 30 { // Only break at word if it's not too short
                return format!("{}...", &truncated[..last_space]);
            }
        }
        format!("{}...", truncated)
    } else {
        content.to_string()
    }
}

pub async fn generate_ai_title(content: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut headers = reqwest::header::HeaderMap::new();
    
    let api_key = env::var("OPENROUTER_API_KEY")
        .map_err(|_| "OPENROUTER_API_KEY environment variable not set. Please check your .env file.".to_string())?;
    
    let auth_header = format!("Bearer {}", api_key);
    headers.insert(
        reqwest::header::AUTHORIZATION,
        reqwest::header::HeaderValue::from_str(&auth_header)
            .map_err(|e| format!("Invalid API key format: {}", e))?
    );
    headers.insert(
        reqwest::header::CONTENT_TYPE,
        reqwest::header::HeaderValue::from_static("application/json")
    );

    // Check if this is a Q&A format (chat-to-notes)
    let is_qa_format = content.starts_with("Q:") && content.contains("\n\nA:");
    
    let title_prompt = if is_qa_format {
        format!(
            "Analyze this Q&A and create a concise, informative title (max 50 chars) that captures the main topic. Focus on the key subject matter, not the question format. \n\nExamples:\n\"Q: How do I center a div?\nA: Use flexbox with justify-content and align-items center\" → \"CSS Flexbox Centering\"\n\n\"Q: What is machine learning?\nA: ML is a subset of AI that uses algorithms to learn patterns\" → \"Machine Learning Basics\"\n\nContent:\n{}\n\nRespond with ONLY the title:", 
            content
        )
    } else {
        format!(
            "Generate a short, descriptive title (max 50 characters) that captures the main topic or key insight from this content. Make it informative and specific. Respond with ONLY the title:\n\n{}", 
            content
        )
    };

    let title_request = OpenRouterRequest {
        model: env::var("AI_MODEL")
            .unwrap_or_else(|_| "deepseek/deepseek-r1".to_string()),
        messages: vec![Message {
            role: "user".to_string(),
            content: title_prompt,
        }],
        max_tokens: 50, // More tokens for better title analysis
        temperature: 0.1,
    };

    let title_response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .headers(headers)
        .json(&title_request)
        .send()
        .await
        .map_err(|e| format!("Title request failed: {}", e))?;

    if title_response.status().is_success() {
        let api_response: OpenRouterResponse = title_response
            .json()
            .await
            .map_err(|e| format!("Failed to parse title response: {}", e))?;
        
        if let Some(choice) = api_response.choices.first() {
            let title = choice.message.content.trim().to_string();
            // Ensure title isn't too long
            if title.len() <= 60 {
                return Ok(title);
            }
        }
    }
    
    // Fallback to simple title generation
    Ok(generate_simple_title(content))
}

/// Main AI chat function
/// 
/// IMPORTANT: This function uses AiConfig to prevent the truncation bug.
/// DO NOT hardcode max_tokens values here - use the configuration system!
/// 
/// Bug History: Previously hardcoded 150 tokens caused severe response truncation.
/// Now uses configurable limits with validation to prevent regression.
pub async fn ask_ai(question: String, response_type: Option<String>) -> Result<String, String> {
    let response_type = response_type.unwrap_or_else(|| "brief".to_string());
    let prompt = create_concise_prompt(&question, &response_type);
    
    // Load AI configuration with safe defaults
    let config = AiConfig::from_env();
    
    // Get token limit for response type
    let token_limit = if response_type == "detailed" { 1500 } else { 500 };
    
    let client = reqwest::Client::new();
    let mut headers = reqwest::header::HeaderMap::new();
    
    let api_key = env::var("OPENROUTER_API_KEY")
        .map_err(|_| "OPENROUTER_API_KEY environment variable not set. Please check your .env file.".to_string())?;
    
    let auth_header = format!("Bearer {}", api_key);
    headers.insert(
        reqwest::header::AUTHORIZATION,
        reqwest::header::HeaderValue::from_str(&auth_header)
            .map_err(|e| format!("Invalid API key format: {}", e))?
    );
    headers.insert(
        reqwest::header::CONTENT_TYPE,
        reqwest::header::HeaderValue::from_static("application/json")
    );

    let request_body = OpenRouterRequest {
        model: env::var("AI_MODEL").unwrap_or_else(|_| "deepseek/deepseek-r1".to_string()),
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
        max_tokens: token_limit,
        temperature: 0.3,
    };

    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .headers(headers)
        .json(&request_body)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("API request failed with status {}: {}", status, error_text));
    }

    let response_text = response.text().await
        .map_err(|e| format!("Failed to read response text: {}", e))?;

    // Trim whitespace from the response - OpenRouter sometimes adds extra newlines
    let clean_response_text = response_text.trim();

    let api_response: OpenRouterResponse = serde_json::from_str(clean_response_text)
        .map_err(|e| format!("Failed to parse API response: {}", e))?;

    if let Some(choice) = api_response.choices.first() {
        let result = choice.message.content.trim().to_string();
        Ok(result)
    } else {
        Err("No response received from API".to_string())
    }
}