@echo off
title VIDORA MCP Server + Cloudflare Tunnel for Hermes
cd /d "%~dp0worker"
python run_mcp_tunnel.py
pause
