# EM Meditations — static site generator
# Zero dependencies; just Node.

OUT := docs
PORT ?= 3000

.PHONY: help build serve preview clean rebuild

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

build: ## Generate the static site into ./docs
	node build.js

serve: build ## Build, then serve ./docs locally (PORT=3000)
	npx serve $(OUT) -l $(PORT)

preview: build ## Build, then open the site in your browser
	open $(OUT)/index.html

clean: ## Remove the generated ./docs directory
	rm -rf $(OUT)

rebuild: clean build ## Clean and build from scratch
