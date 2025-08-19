from pydantic import BaseModel, Field


class ScoreIn(BaseModel):
    text: str = Field(..., min_length=300, description="Text to analyze for AI generation probability")

class ScoreOut(BaseModel):
    prob_ai: float = Field(..., description="Probability that the text is AI-generated")
    n_tokens: int = Field(..., description="Number of tokens in the input text")
    model: str = Field(..., description="Model used for the analysis")
    version: str = Field("1.0.0", description="API version")
    latency: float = Field(..., description="Time taken for the inference in seconds")