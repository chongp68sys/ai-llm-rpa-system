#!/bin/bash

# Ralph with Claude Code - Production Ready with GitHub Integration
# Based on YC Hackathon implementation with enhanced GitHub features

set -e

# Configuration
PROMPT_FILE="PROMPT.md"
LOG_FILE="ralph.log"
MAX_ITERATIONS=${MAX_ITERATIONS:-50}
RALPH_DELAY=${RALPH_DELAY:-2}
CURRENT_ITERATION=0
GITHUB_ENABLED=true

# Colors for better logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_github() {
    echo -e "${PURPLE}[$(date '+%Y-%m-%d %H:%M:%S')] GITHUB:${NC} $1" | tee -a "$LOG_FILE"
}

# Enhanced GitHub functions
check_github_setup() {
    log "🔍 Checking GitHub setup..."
    
    # Check if we're in a git repo
    if [[ ! -d ".git" ]]; then
        log_warning "Not a git repository. Initializing..."
        git init
        git branch -M main
    fi
    
    # Check for GitHub remote
    if ! git remote get-url origin &>/dev/null; then
        log_warning "No GitHub remote configured. You can add one later with:"
        log "    git remote add origin https://github.com/username/repo.git"
        GITHUB_ENABLED=false
    else
        GITHUB_REMOTE=$(git remote get-url origin)
        log_github "Connected to: $GITHUB_REMOTE"
    fi
    
    # Check git user config
    if [[ -z "$(git config user.name)" ]] || [[ -z "$(git config user.email)" ]]; then
        log_warning "Git user not configured. Setting up..."
        setup_git_user
    fi
    
    # Check for GitHub CLI (optional but helpful)
    if command -v gh &> /dev/null; then
        log_github "GitHub CLI detected - enhanced features available"
        GH_AVAILABLE=true
    else
        log_warning "GitHub CLI not found. Install with: brew install gh"
        GH_AVAILABLE=false
    fi
}

setup_git_user() {
    read -p "Enter your GitHub username: " GIT_USERNAME
    read -p "Enter your GitHub email: " GIT_EMAIL
    
    git config --global user.name "$GIT_USERNAME"
    git config --global user.email "$GIT_EMAIL"
    
    log_success "Git user configured: $GIT_USERNAME <$GIT_EMAIL>"
}

commit_and_push() {
    local commit_type="$1"
    local commit_msg="$2"
    local iteration="$3"
    
    if [[ -n $(git status --porcelain) ]]; then
        log "📦 Committing changes..."
        
        # Stage all changes
        git add -A
        
        # Create enhanced commit message with conventional commits format
        local full_commit_msg
        if [[ -n "$commit_type" ]]; then
            full_commit_msg="$commit_type: $commit_msg

Ralph iteration $iteration: $(date '+%Y-%m-%d %H:%M:%S')

- Automated by Ralph autonomous coding system
- Based on tasks from fix_plan.md
- See AGENT.md for build/test instructions"
        else
            full_commit_msg="Ralph iteration $iteration: $commit_msg

Automated commit: $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        
        git commit -m "$full_commit_msg"
        
        # Enhanced push with retry logic
        if [[ "$GITHUB_ENABLED" == true ]]; then
            push_to_github
        else
            log_warning "GitHub not configured, skipping push"
        fi
        
        # Check if we should create a release tag
        create_release_tag_if_needed
        
        return 0
    else
        log "No changes to commit"
        return 1
    fi
}

push_to_github() {
    local max_retries=3
    local retry=0
    
    while [[ $retry -lt $max_retries ]]; do
        if git push origin main 2>/dev/null; then
            log_github "✅ Changes pushed to GitHub successfully"
            
            # Push tags if any exist
            if git tag --list | grep -q .; then
                git push origin --tags 2>/dev/null && log_github "🏷️ Tags pushed to GitHub"
            fi
            
            return 0
        else
            ((retry++))
            log_warning "⚠️ Push failed, attempt $retry/$max_retries"
            
            if [[ $retry -lt $max_retries ]]; then
                log "Retrying in 5 seconds..."
                sleep 5
            fi
        fi
    done
    
    log_error "❌ Failed to push after $max_retries attempts"
    log "💡 Manual push may be needed: git push origin main"
    log "💡 Check GitHub authentication or network connection"
    return 1
}

create_release_tag_if_needed() {
    # Only create tags when major milestones are hit or tests pass
    if [[ -f "package.json" ]] && npm test &>/dev/null; then
        create_version_tag "Tests passing"
    elif [[ -f "Cargo.toml" ]] && cargo test &>/dev/null; then
        create_version_tag "Tests passing"
    elif [[ -f "requirements.txt" ]] && python -m pytest &>/dev/null; then
        create_version_tag "Tests passing"
    elif [[ $(git log --oneline | wc -l) -gt 0 ]] && [[ $((CURRENT_ITERATION % 10)) -eq 0 ]]; then
        create_version_tag "Ralph milestone"
    fi
}

create_version_tag() {
    local reason="$1"
    
    # Get latest tag or start at v0.0.0
    local latest_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    
    # Simple increment patch version
    local version_num=$(echo "$latest_tag" | sed 's/v//')
    local major=$(echo "$version_num" | cut -d. -f1)
    local minor=$(echo "$version_num" | cut -d. -f2)
    local patch=$(echo "$version_num" | cut -d. -f3)
    
    # Increment patch
    patch=$((patch + 1))
    local new_tag="v$major.$minor.$patch"
    
    # Only create tag if there are no uncommitted changes
    if [[ -z $(git status --porcelain) ]]; then
        git tag -a "$new_tag" -m "Ralph auto-release: $reason

Created by Ralph iteration $CURRENT_ITERATION
$(date '+%Y-%m-%d %H:%M:%S')"
        
        log_github "🏷️ Created release tag: $new_tag ($reason)"
        
        # Try to push the tag
        if [[ "$GITHUB_ENABLED" == true ]]; then
            git push origin "$new_tag" 2>/dev/null && log_github "📦 Release tag pushed to GitHub"
        fi
    fi
}

check_github_issues() {
    if [[ "$GH_AVAILABLE" == true ]]; then
        local open_issues=$(gh issue list --limit 5 --json number,title --jq '.[].title' 2>/dev/null || echo "")
        if [[ -n "$open_issues" ]]; then
            log_github "📋 Open GitHub issues found - Ralph could work on these"
            echo "$open_issues" | head -3 | while read -r issue; do
                log_github "   - $issue"
            done
        fi
    fi
}

# Check prerequisites
check_setup() {
    log "🔍 Checking Ralph setup..."
    
    # Check Claude Code installation
    if ! command -v claude &> /dev/null; then
        log_error "Claude Code not found. Install with: npm install -g @anthropic-ai/claude-code"
        exit 1
    fi
    
    # Check GitHub setup
    check_github_setup
    
    # Check essential files
    if [[ ! -f "$PROMPT_FILE" ]]; then
        log_error "PROMPT.md not found. Creating template..."
        create_prompt_template
    fi
    
    if [[ ! -f "fix_plan.md" ]]; then
        log_warning "fix_plan.md not found. Creating template..."
        create_fixplan_template
    fi
    
    if [[ ! -f "AGENT.md" ]]; then
        log_warning "AGENT.md not found. Creating template..."
        create_agent_template
    fi
    
    # Create .gitignore if it doesn't exist
    if [[ ! -f ".gitignore" ]]; then
        create_gitignore
    fi
    
    # Create README if it doesn't exist
    if [[ ! -f "README.md" ]]; then
        create_readme
    fi
    
    # Initial commit if repo is empty
    if [[ -z $(git log --oneline 2>/dev/null) ]]; then
        git add .
        git commit -m "feat: initial Ralph setup

- Ralph autonomous coding system initialized
- Project structure and configuration files created
- Ready for autonomous development"
        
        log_success "Initial commit created"
        
        if [[ "$GITHUB_ENABLED" == true ]]; then
            push_to_github
        fi
    fi
    
    log_success "Setup check complete"
}

create_gitignore() {
    cat > ".gitignore" << 'EOF'
# Ralph logs
ralph.log
*.log

# Dependencies
node_modules/
venv/
env/
target/
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Build outputs
dist/
build/
*.exe
*.dll

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
pip-log.txt

# Node.js
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Rust
Cargo.lock
target/

# Java
*.class
*.jar
*.war
*.ear
EOF
    log_success "Created .gitignore"
}

create_readme() {
    local repo_name=$(basename "$(pwd)")
    cat > "README.md" << EOF
# $repo_name

🤖 **This project is being built autonomously using Ralph with Claude Code**

## About Ralph

Ralph is an autonomous coding technique that runs AI in a continuous loop to build software. This project demonstrates the Ralph approach based on [@ghuntley](https://github.com/ghuntley)'s work.

## Project Status

- 🤖 **Built by Ralph**: Developed autonomously with minimal human intervention
- 📊 **Progress**: Check [fix_plan.md](./fix_plan.md) for current status  
- 📝 **Commit History**: Each commit represents one Ralph iteration
- ��️ **Build Instructions**: See [AGENT.md](./AGENT.md)

## Running This Project

\`\`\`bash
# Install dependencies (see AGENT.md for specifics)
# Build the project
# Run the project
\`\`\`

## Ralph Configuration

- **Main Prompt**: [PROMPT.md](./PROMPT.md) - Ralph's instructions
- **Task List**: [fix_plan.md](./fix_plan.md) - Current priorities  
- **Build Guide**: [AGENT.md](./AGENT.md) - How to build/test
- **Automation**: \`ralph.sh\` - The Ralph loop script

## How Ralph Works

1. **Plan**: Ralph reads tasks from \`fix_plan.md\`
2. **Code**: Implements one task per iteration
3. **Test**: Runs tests and validates changes  
4. **Commit**: Auto-commits with descriptive messages
5. **Repeat**: Continuous loop until tasks complete

## Development Timeline

This repository shows Ralph's autonomous development process:
- Each commit = one Ralph iteration
- Commit messages show what Ralph accomplished
- Tags mark significant milestones
- Issues can be created for Ralph to work on

## Contributing

While Ralph works autonomously, you can:
- Add tasks to \`fix_plan.md\`
- Create GitHub issues for Ralph to address
- Review and approve Ralph's pull requests
- Tune Ralph's prompts in \`PROMPT.md\`

---

*🤖 This README was generated by Ralph autonomous coding system*  
*Last updated: $(date '+%Y-%m-%d %H:%M:%S')*
EOF
    log_success "Created README.md"
}

create_prompt_template() {
    cat > "$PROMPT_FILE" << 'EOF'
# Ralph Autonomous Development Prompt

## Project Context
You are Ralph, an autonomous coding assistant working on this project.

## Current Status
1. Study @fix_plan.md to understand priorities and completed work
2. Study @AGENT.md for build/test instructions  
3. Review recent git commits to understand progress
4. Check for GitHub issues that need attention (use `gh issue list` if available)

## This Iteration's Task
Choose EXACTLY ONE item from fix_plan.md - the most important incomplete task.

## Execution Rules
1. Do ONE task only per iteration
2. Search existing codebase before implementing (use grep/ripgrep)
3. After implementing, run tests as specified in AGENT.md
4. Update fix_plan.md with progress using clear status markers
5. Commit changes with conventional commit format: "feat:", "fix:", "docs:", etc.
6. Update AGENT.md if you discover new build/test patterns

## GitHub Integration
- Reference issue numbers in commit messages when relevant: "fixes #123"
- Create GitHub issues for bugs you discover using `gh issue create` if available
- Check for pull requests or issues that need attention
- Update README.md with significant changes

## Quality Standards
- NO placeholder implementations - full, working implementations only
- Document the WHY in comments, especially for complex logic
- Write tests for new functionality
- Handle error cases appropriately
- Follow project coding standards and best practices

## Progress Tracking
- Mark completed items in fix_plan.md with ✅
- Add any discovered bugs/issues to fix_plan.md
- Update timestamps and notes in fix_plan.md
- Keep README.md current with project status

## Current Priority
Read fix_plan.md and implement the highest priority incomplete item.
Focus on creating working, tested code that moves the project forward.
EOF
    log_success "Created PROMPT.md template with GitHub integration"
}

create_fixplan_template() {
    cat > "fix_plan.md" << 'EOF'
# Ralph Fix Plan

Last updated: [Ralph updates this]

## 🚀 High Priority
- [ ] Set up project dependencies and build system
- [ ] Implement core application functionality
- [ ] Add comprehensive test suite
- [ ] Create user documentation and examples

## 📋 Medium Priority  
- [ ] Add error handling and logging
- [ ] Implement data persistence/storage
- [ ] Add configuration management
- [ ] Performance optimization and monitoring

## 🎨 Low Priority
- [ ] UI/UX improvements
- [ ] Code refactoring and cleanup
- [ ] Additional features and integrations
- [ ] Advanced deployment options

## 🔄 In Progress
- [ ] [Current task Ralph is working on]

## ✅ Completed
- [x] Initialize Ralph automation system
- [x] Set up git repository and GitHub integration
- [x] Create project documentation structure

## 🐛 Bugs/Issues Discovered
- [ ] [Bugs Ralph finds get listed here with description]

## 🏷️ GitHub Issues
- [ ] Check for open issues: `gh issue list`
- [ ] Address high-priority issues first
- [ ] Create issues for bugs discovered during development

## 📝 Development Notes
- Ralph learns and improves with each iteration
- Keep tasks specific and measurable
- Break large tasks into smaller, manageable pieces
- Test thoroughly before marking items complete
- Update documentation as features are added

## 📊 Project Statistics
- Total commits: [Ralph can update this]
- Current version: [Based on git tags]
- Test coverage: [If applicable]
- Build status: [Pass/Fail]
EOF
    log_success "Created fix_plan.md template with GitHub integration"
}

create_agent_template() {
    cat > "AGENT.md" << 'EOF'
# Agent Build & Test Instructions

Last updated: [Ralph updates this timestamp]

## 🏗️ Setup Commands
```bash
# Initial project setup
# Add your specific setup commands here
# Examples:
# npm install
# pip install -r requirements.txt  
# cargo build
# make setup
```

## 🔨 Build Commands
```bash
# How to build the project
# Examples:
# npm run build
# cargo build --release
# make build
# python setup.py build
```

## 🧪 Test Commands
```bash
# How to run tests
# Examples:
# npm test
# cargo test
# pytest
# python -m unittest
# make test
```

## 🚀 Run Commands
```bash
# How to run the application
# Examples:
# npm start
# cargo run
# python main.py
# ./target/release/app
```

## 🛠️ Development Commands
```bash
# Useful development commands
# Examples:
# npm run dev
# npm run lint
# cargo fmt
# black .
# make format
```

## 🐙 GitHub Commands
```bash
# GitHub CLI commands Ralph can use
gh issue list                    # List open issues
gh issue create --title "Bug"    # Create new issue
gh pr list                       # List pull requests
gh repo view                     # View repository info
```

## 🔍 Code Quality Commands
```bash
# Static analysis and linting
# Examples:
# eslint .
# cargo clippy
# pylint src/
# rubocop
```

## 📦 Deployment Commands
```bash
# How to deploy/package the application
# Examples:
# npm run deploy
# cargo package
# docker build -t app .
# make deploy
```

## 📚 Ralph Learning Notes
Ralph updates this section as it discovers new patterns:

- Build system: [To be discovered]
- Test framework: [To be discovered]  
- Deployment method: [To be discovered]
- Code style: [To be discovered]

## ⚡ Performance Notes
- Build time: [Ralph tracks this]
- Test execution time: [Ralph measures this]
- Common bottlenecks: [Ralph identifies these]

Keep this file current for optimal Ralph performance!
EOF
    log_success "Created AGENT.md template with GitHub integration"
}

run_ralph_iteration() {
    ((CURRENT_ITERATION++))
    
    log "🤖 Ralph iteration $CURRENT_ITERATION/$MAX_ITERATIONS"
    
    # Check iteration limit
    if [[ $CURRENT_ITERATION -gt $MAX_ITERATIONS ]]; then
        log_warning "Maximum iterations ($MAX_ITERATIONS) reached. Stopping Ralph."
        log "To continue, run: MAX_ITERATIONS=100 ./ralph.sh"
        exit 0
    fi
    
    # Check for GitHub issues periodically
    if [[ $((CURRENT_ITERATION % 5)) -eq 0 ]]; then
        check_github_issues
    fi
    
    # Run Claude Code with the prompt (same as hackathon team)
    log "📝 Executing Claude Code..."
    
    if cat "$PROMPT_FILE" | claude -p --dangerously-skip-permissions; then
        log_success "Claude Code execution completed"
        
        # Enhanced commit with better categorization
        local commit_type=""
        local commit_msg="Automated development iteration"
        
        # Try to detect what kind of changes were made
        if git diff --cached --name-only 2>/dev/null | grep -q -E "\.(test|spec)\.|test_|_test\."; then
            commit_type="test"
            commit_msg="Add/update tests"
        elif git diff --cached --name-only 2>/dev/null | grep -q -E "README|CHANGELOG|\.md$"; then
            commit_type="docs"
            commit_msg="Update documentation"
        elif git diff --cached --name-only 2>/dev/null | grep -q -E "fix_plan\.md"; then
            commit_type="chore"
            commit_msg="Update task planning"
        else
            commit_type="feat"
            commit_msg="Implement new functionality"
        fi
        
        # Commit and push changes
        if commit_and_push "$commit_type" "$commit_msg" "$CURRENT_ITERATION"; then
            log_success "Iteration $CURRENT_ITERATION completed with changes"
        else
            log "Iteration $CURRENT_ITERATION completed (no changes)"
        fi
        
        return 0
    else
        log_error "Claude Code execution failed"
        return 1
    fi
}

show_status() {
    echo ""
    echo "📊 Ralph Status Report"
    echo "======================="
    echo "   🔄 Iteration: $CURRENT_ITERATION/$MAX_ITERATIONS"
    echo "   📁 Log file: $LOG_FILE"
    echo "   🐙 GitHub: $(if [[ "$GITHUB_ENABLED" == true ]]; then echo "✅ Connected"; else echo "❌ Not configured"; fi)"
    echo ""
    echo "📝 Recent Commits:"
    git log --oneline --graph -5 2>/dev/null || echo "   No commits yet"
    echo ""
    echo "📋 Current Priorities (from fix_plan.md):"
    grep -E "^- \[ \]" fix_plan.md | head -3 2>/dev/null || echo "   No pending tasks found"
    echo ""
    
    if [[ "$GH_AVAILABLE" == true ]]; then
        echo "🐙 GitHub Issues:"
        gh issue list --limit 3 --json number,title --template '{{range .}}   #{{.number}}: {{.title}}{{"\n"}}{{end}}' 2>/dev/null || echo "   No issues or GitHub CLI not authenticated"
        echo ""
    fi
    
    echo "🏷️  Latest Release:"
    git describe --tags --abbrev=0 2>/dev/null || echo "   No releases yet"
    echo ""
}

setup_github_remote() {
    echo "Setting up GitHub remote..."
    read -p "Enter your GitHub username: " GITHUB_USERNAME
    read -p "Enter your repository name: " REPO_NAME
    
    git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    GITHUB_ENABLED=true
    
    log_github "GitHub remote added: https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    log "Push your initial commit with: git push -u origin main"
}

cleanup() {
    log "🛑 Ralph stopped by user at iteration $CURRENT_ITERATION"
    
    # Create final status commit
    if [[ -n $(git status --porcelain) ]]; then
        git add ralph.log 2>/dev/null || true
        git commit -m "chore: Ralph session ended at iteration $CURRENT_ITERATION

Session summary:
- Runtime: $(date)
- Iterations completed: $CURRENT_ITERATION
- GitHub integration: $GITHUB_ENABLED

Ralph autonomous coding session complete." 2>/dev/null || true
        
        if [[ "$GITHUB_ENABLED" == true ]]; then
            push_to_github
        fi
    fi
    
    show_status
    exit 0
}

# Handle interruption gracefully  
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    log "🚀 Starting Ralph with Claude Code + GitHub Integration"
    log "Configuration: MAX_ITERATIONS=$MAX_ITERATIONS, DELAY=$RALPH_DELAY"
    
    check_setup
    
    log "Ralph is ready. Press Ctrl+C to stop."
    log "Monitor progress: tail -f $LOG_FILE"
    log "Check status anytime: ./ralph.sh --status"
    
    # Main Ralph loop
    while true; do
        if ! run_ralph_iteration; then
            log_error "Iteration failed. Waiting 10 seconds before retry..."
            sleep 10
        else
            # Brief pause between iterations
            sleep "$RALPH_DELAY"
        fi
    done
}

# Command line options
case "${1:-}" in
    -h|--help)
        echo "Ralph with Claude Code + GitHub Integration"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  -h, --help       Show this help"
        echo "  -s, --status     Show current status and GitHub info"
        echo "  -1, --single     Run single iteration"
        echo "  --init           Initialize Ralph in current directory"
        echo "  --setup-github   Setup GitHub remote repository"
        echo ""
        echo "Environment Variables:"
        echo "  MAX_ITERATIONS=50    Maximum iterations (default: 50)"
        echo "  RALPH_DELAY=2        Delay between iterations (default: 2s)"
        echo ""
        echo "GitHub Features:"
        echo "  • Auto-commit with conventional commit messages"
        echo "  • Auto-push to GitHub with retry logic"
        echo "  • Release tagging when tests pass"
        echo "  • GitHub Issues integration (with gh CLI)"
        echo "  • Enhanced README and documentation"
        echo ""
        exit 0
        ;;
    -s|--status)
        show_status
        exit 0
        ;;
    -1|--single)
        log "🔄 Running single Ralph iteration"
        check_setup
        run_ralph_iteration
        show_status
        exit $?
        ;;
    --init)
        log "🏁 Initializing Ralph with GitHub integration"
        check_setup
        log_success "Ralph initialized! Next steps:"
        log "  1. Edit PROMPT.md and fix_plan.md for your project"
        log "  2. Set up GitHub remote: ./ralph.sh --setup-github"
        log "  3. Run Ralph: ./ralph.sh"
        exit 0
        ;;
    --setup-github)
        setup_github_remote
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac
