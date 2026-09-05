#!/bin/bash
set -e

echo "==> Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Wait until the Ollama API is accepting connections using 'ollama list'
echo "==> Waiting for Ollama API to be ready..."
until ollama list > /dev/null 2>&1; do
  sleep 2
done
echo "==> Ollama API is up."

# Pull models
echo "==> Pulling nomic-embed-text (embedding model)..."
ollama pull nomic-embed-text

echo "==> Pulling hermes3:3b (chat model)..."
ollama pull hermes3:3b

echo "==> All models ready! Ollama is fully operational."

# Hand off to the Ollama server process
wait $OLLAMA_PID
