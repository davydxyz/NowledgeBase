use std::env;

/// AI Configuration constants and validation
/// 
/// IMPORTANT: These constants prevent the chat truncation bug from recurring.
/// DO NOT use hardcoded low values like 150 tokens - they cause incomplete responses!

/// Minimum safe token limit for chat responses
pub const MIN_SAFE_TOKENS: u32 = 300;

/// Default token limits for different response types
pub const DEFAULT_BRIEF_TOKENS: u32 = 500;
pub const DEFAULT_DETAILED_TOKENS: u32 = 1500;
pub const DEFAULT_YES_NO_TOKENS: u32 = 100;
pub const DEFAULT_BULLET_TOKENS: u32 = 400;

/// Maximum reasonable token limit (to prevent excessive API costs)
pub const MAX_REASONABLE_TOKENS: u32 = 4000;

/// AI Configuration structure
pub struct AiConfig {
    pub model: String,
    pub brief_tokens: u32,
    pub detailed_tokens: u32,
    pub yes_no_tokens: u32,
    pub bullet_tokens: u32,
}

impl AiConfig {
    /// Load configuration from environment variables with safe defaults
    pub fn from_env() -> Self {
        let config = Self {
            model: env::var("AI_MODEL")
                .unwrap_or_else(|_| "deepseek/deepseek-r1".to_string()),
            brief_tokens: parse_env_token_limit("MAX_TOKENS", DEFAULT_BRIEF_TOKENS),
            detailed_tokens: parse_env_token_limit("MAX_DETAILED_TOKENS", DEFAULT_DETAILED_TOKENS),
            yes_no_tokens: parse_env_token_limit("MAX_YES_NO_TOKENS", DEFAULT_YES_NO_TOKENS),
            bullet_tokens: parse_env_token_limit("MAX_BULLET_TOKENS", DEFAULT_BULLET_TOKENS),
        };
        
        // Validate configuration
        config.validate();
        config
    }
    
    /// Get token limit for specific response type
    pub fn get_token_limit(&self, response_type: &str) -> u32 {
        match response_type {
            "detailed" => self.detailed_tokens,
            "yes_no" => self.yes_no_tokens,
            "bullet" => self.bullet_tokens,
            _ => self.brief_tokens, // "brief" and default
        }
    }
    
    /// Validate configuration and log warnings for unsafe values
    fn validate(&self) {
        if self.brief_tokens < MIN_SAFE_TOKENS {
            eprintln!("⚠️  WARNING: brief_tokens ({}) is below safe minimum ({}). This may cause truncated responses!", 
                     self.brief_tokens, MIN_SAFE_TOKENS);
        }
        
        if self.detailed_tokens < MIN_SAFE_TOKENS {
            eprintln!("⚠️  WARNING: detailed_tokens ({}) is below safe minimum ({}). This may cause truncated responses!", 
                     self.detailed_tokens, MIN_SAFE_TOKENS);
        }
        
        // Check for unreasonably high values
        if self.detailed_tokens > MAX_REASONABLE_TOKENS {
            eprintln!("⚠️  WARNING: detailed_tokens ({}) is very high. This may cause excessive API costs!", 
                     self.detailed_tokens);
        }
    }
}

/// Parse token limit from environment with validation
fn parse_env_token_limit(env_var: &str, default: u32) -> u32 {
    env::var(env_var)
        .ok()
        .and_then(|s| s.parse().ok())
        .map(|tokens| {
            if tokens < MIN_SAFE_TOKENS {
                eprintln!("⚠️  WARNING: {} ({}) is below safe minimum ({}). Using minimum safe value.", 
                         env_var, tokens, MIN_SAFE_TOKENS);
                MIN_SAFE_TOKENS
            } else if tokens > MAX_REASONABLE_TOKENS {
                eprintln!("⚠️  WARNING: {} ({}) is very high. Consider if this is necessary.", 
                         env_var, tokens);
                tokens
            } else {
                tokens
            }
        })
        .unwrap_or(default)
}