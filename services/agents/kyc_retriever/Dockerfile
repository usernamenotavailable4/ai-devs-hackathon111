FROM python:3.11-slim
WORKDIR /app
COPY services/agents/common/requirements.txt ./common-requirements.txt
RUN pip install --no-cache-dir -r common-requirements.txt
COPY services/agents/kyc_retriever/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY services/agents/common ./common
COPY services/agents/kyc_retriever/agent.py ./agent.py
COPY fixtures /app/fixtures
CMD ["python", "agent.py"]
