#!/bin/bash
while true; do
  echo "Checking for updates..."
  git pull
  echo "Sleeping for 60 seconds."
  sleep 60
done