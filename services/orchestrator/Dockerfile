FROM python:3.11-slim
WORKDIR /app
COPY common/requirements.txt ./common-requirements.txt
RUN pip install --no-cache-dir -r common-requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY common ./common
COPY orchestrator.py lyzr_client.py ./
CMD ["python", "orchestrator.py"]
