FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && python -m spacy download en_core_web_lg
COPY . .
EXPOSE 8020
CMD ["uvicorn", "masker:app", "--host", "0.0.0.0", "--port", "8020"]
