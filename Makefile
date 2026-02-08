.PHONY: help up down logs restart clean build

help:
	@echo "Available commands:"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make logs      - View logs"
	@echo "  make restart   - Restart services"
	@echo "  make build     - Rebuild images"
	@echo "  make clean     - Remove all containers and volumes"

up:
	docker-compose up -d --build

down:
	docker-compose down

logs:
	docker-compose logs -f

restart:
	docker-compose restart

build:
	docker-compose up -d --build

clean:
	docker-compose down -v
	docker system prune -f
