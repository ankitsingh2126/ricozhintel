# Ricozhintel - Server

Express + Mongoose backend for Ricozhintel.

## Setup

    npm install
    Copy-Item .env.example .env

## Run (development)

    npm run dev

## Health check

    GET http://localhost:5000/api/v1/health

## Scripts

- npm run dev  - start with nodemon (auto-reload)
- npm start    - start with node

## Environment

Copy `.env.example` to `.env` and fill in values.
Never commit `.env` files.
