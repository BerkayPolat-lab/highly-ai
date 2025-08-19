from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch
import time

model_name = "Hello-SimpleAI/chatgpt-detector-roberta"
_tokenizer = AutoTokenizer.from_pretrained(model_name)
_model = AutoModelForSequenceClassification.from_pretrained(model_name)
_model.eval()

def prob_ai(text: str) -> tuple[float, int, str]:
    if (len(text.strip()) < 300):
        raise ValueError("Text must be at least 300 characters long")
        
    enc = _tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    with torch.no_grad():
        logits = _model(input_ids=enc["input_ids"], attention_mask=enc["attention_mask"]).logits
        prob_ai = torch.softmax(logits, dim=-1)[0, 1].item()

    n_tokens = int(enc["input_ids"].shape[1])

    return (float(prob_ai), n_tokens, model_name)

if __name__ == "__main__":
    text = "In other words, the FastAPI-related files are essentially your backend codebase. They're separate from the extension’s front-end code, and you’d deploy that FastAPI server somewhere (like on a cloud provider or your local machine) so the Chrome extension can talk to it over the network. So, to sum it up: FastAPI is handling your backend API logic, and those files are separate from your Chrome extension’s front-end files. The extension just makes requests to those FastAPI endpoints whenever it needs to interact with the backend."
    try:
        probability, tokens, model = prob_ai(text)
        print(f"Probability of AI-generated text: {probability}, Tokens: {tokens}, Model: {model}")
    except ValueError as e:
        print(e)
    
