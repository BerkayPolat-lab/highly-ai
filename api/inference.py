from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

model_name = "Hello-SimpleAI/chatgpt-detector-roberta"
_tokenizer = AutoTokenizer.from_pretrained(model_name)
_model = AutoModelForSequenceClassification.from_pretrained(model_name)
_model.eval()

def prob_ai(text: str) -> tuple[float, int, str]:
    if (len(text.strip()) < 100):
        raise ValueError("Text must be at least 100 characters long")
    
    
    enc = _tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    with torch.no_grad():
        logits = _model(input_ids=enc["input_ids"], attention_mask=enc["attention_mask"]).logits
        prob_ai = torch.softmax(logits, dim=-1)[0, 1].item()

    n_tokens = int(enc["input_ids"].shape[1])
    return (float(prob_ai), n_tokens, model_name)

if __name__ == "__main__":
    text = "This is a sample text to test the AI detection model. " * 10  
    try:
        probability, tokens, model = prob_ai(text)
        print(f"Probability of AI-generated text: {probability}, Tokens: {tokens}, Model: {model}")
    except ValueError as e:
        print(e)
    
