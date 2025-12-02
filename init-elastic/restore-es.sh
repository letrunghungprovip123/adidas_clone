#!/bin/sh

echo "⏳ Waiting for Elasticsearch to start..."
sleep 20

echo "📦 Restoring Elasticsearch Index..."
tar -xf /backup/es_backup.tar -C /usr/share/elasticsearch/data

echo "👍 Restore ES Done."
