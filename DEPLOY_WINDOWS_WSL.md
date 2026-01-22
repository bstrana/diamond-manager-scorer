# Deploying to Cloudron from Windows with WSL

This guide is specifically for Windows users with WSL (Windows Subsystem for Linux) installed.

## Prerequisites Check

1. **Docker Desktop** - Make sure it's installed and running
2. **WSL 2** - Your WSL should be using WSL 2 (check with `wsl --list --verbose` in PowerShell)
3. **Docker Desktop WSL Integration** - In Docker Desktop settings, enable integration with your WSL distribution

## Step 1: Open WSL Terminal

Open your WSL terminal (Ubuntu, Debian, etc.). You can:
- Open from Start Menu: Search for "Ubuntu" or your WSL distribution
- Or open PowerShell and type: `wsl`

## Step 2: Navigate to Your Project

In WSL, navigate to your project directory. Windows drives are mounted under `/mnt/`:

```bash
cd /mnt/c/Users/Korisnik/Documents/YOURBALL.CLUB/baseball-scorer
```

**Tip:** If you're not sure of the exact path, you can:
1. Open File Explorer and navigate to your project
2. Right-click in the address bar and copy the path
3. Convert it: `C:\Users\...` becomes `/mnt/c/Users/...` (replace backslashes with forward slashes)

## Step 3: Verify Docker Works

Check that Docker is accessible from WSL:

```bash
docker --version
docker ps
```

If you get an error, make sure:
- Docker Desktop is running
- WSL integration is enabled in Docker Desktop settings

## Step 4: Build the Docker Image

```bash
docker build -t baseball-scorer:latest .
```

This will build the app. First build may take several minutes.

## Step 5: Tag for Docker Hub

```bash
docker tag baseball-scorer:latest YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest
```

Replace `YOUR_DOCKERHUB_USERNAME` with your Docker Hub username.

## Step 6: Login to Docker Hub

```bash
docker login
```

Enter your Docker Hub username and password (or access token).

## Step 7: Push to Docker Hub

```bash
docker push YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest
```

Wait for the upload to complete.

## Step 8: Install Node.js (if needed)

Check if Node.js is installed:

```bash
node --version
npm --version
```

If not installed, install Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Or use the version manager `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

## Step 9: Install Cloudron CLI

```bash
npm install -g cloudron
```

## Step 10: Login to Cloudron

```bash
cloudron login YOUR_CLOUDRON_DOMAIN
```

Replace `YOUR_CLOUDRON_DOMAIN` with your Cloudron instance domain.

## Step 11: Install the App

```bash
cloudron install \
  --image YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest \
  -l baseball-scorer \
  --env UNLOCK_KEY=unlock
```

**Replace:**
- `YOUR_DOCKERHUB_USERNAME` with your Docker Hub username
- `baseball-scorer` with your preferred subdomain (or use `-l baseball-scorer.YOUR_CLOUDRON_DOMAIN` for full domain)

**With Directus environment variables:**
```bash
cloudron install \
  --image YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest \
  -l baseball-scorer \
  --env UNLOCK_KEY=unlock \
  --env DIRECTUS_URL=https://your-directus.com \
  --env DIRECTUS_STATIC_TOKEN=your-token \
  --env DIRECTUS_SCOREKEEPER_TOKEN=your-token
```

**Note:** The `-l` (or `--location`) option sets the subdomain. If you omit the domain part, Cloudron will use your default domain.

## Troubleshooting

### Docker command not found in WSL
- Make sure Docker Desktop is running
- Check Docker Desktop Settings → General → "Use the WSL 2 based engine"
- Check Docker Desktop Settings → Resources → WSL Integration → Enable integration with your WSL distribution

### Permission denied errors
- Use `sudo` for system-level commands (npm install -g might need it)
- Or fix npm permissions: `mkdir ~/.npm-global && npm config set prefix '~/.npm-global'`

### Path issues
- Use forward slashes `/` in WSL, not backslashes `\`
- Windows paths start with `/mnt/c/` in WSL
- You can use `pwd` to see your current directory

### Node.js version issues
- Use Node.js 18+ (version 20 recommended)
- Consider using `nvm` for easier version management

## Quick Reference

**Windows path to WSL path conversion:**
- `C:\Users\...` → `/mnt/c/Users/...`
- `D:\Projects\...` → `/mnt/d/Projects/...`

**Useful WSL commands:**
- `wsl --list --verbose` - List WSL distributions (run in PowerShell)
- `pwd` - Show current directory
- `ls` - List files
- `cd` - Change directory

