use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct GraphViewport {
    pub x: f64,
    pub y: f64,
    pub zoom: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct UIState {
    pub graph_viewport: GraphViewport,
}

#[derive(Serialize, Deserialize)]
pub struct UIStateDatabase {
    pub ui_state: UIState,
}