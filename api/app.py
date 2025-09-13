from time import perf_counter

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api import inference, schemas

app = FastAPI(title="AI Text Detection API", version="1.0.0")

# origins = [
#     "http://127.0.0.1:5173",
#     "http://localhost:5173",
#     "chrome-extension://eiemcmnkdnlcekmpffajbkgmldegejdm",
# ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz():
    return {"message": "API is running."}


@app.post("/score")
def score(payload: schemas.ScoreIn) -> schemas.ScoreOut:
    try:
        start_time = perf_counter()
        prob, n_tokens, model = inference.prob_ai(payload.text)
        end_time = perf_counter()

        return schemas.ScoreOut(
            prob_ai=prob,
            n_tokens=n_tokens,
            model=model,
            version="1.0.0",
            latency=end_time - start_time,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
