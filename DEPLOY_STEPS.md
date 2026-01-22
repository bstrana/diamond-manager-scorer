# Quick Deployment Steps for Cloudron

## Step 1: Build the Docker Image

**On Windows with WSL:**

1. **Open WSL terminal** (Ubuntu or your WSL distribution)
2. **Navigate to your project directory:**
   ```bash
   cd /mnt/c/Users/Korisnik/Documents/YOURBALL.CLUB/baseball-scorer
   ```
   (Adjust the path if your project is in a different location)

3. **Build the Docker image:**
   ```bash
   docker build -t baseball-scorer:latest .
   ```

This will build the app. It may take a few minutes the first time.

**Note:** Make sure Docker Desktop is running and configured to use WSL 2 backend. You can verify Docker works:
```bash
docker --version
```

## Step 2: Tag for Docker Hub

Tag the image with your Docker Hub username and repository name:

```bash
docker tag baseball-scorer:latest YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest
```

Replace `YOUR_DOCKERHUB_USERNAME` with your actual Docker Hub username.

## Step 3: Login to Docker Hub

```bash
docker login
```

Enter your Docker Hub username and password (or access token).

## Step 4: Push to Docker Hub

```bash
docker push YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest
```

This will upload the image to Docker Hub. Wait for it to complete.

## Step 5: Install Cloudron CLI

Cloudron 9 requires using the CLI to install custom apps. 

**On Windows with WSL:**

1. **Open WSL terminal** (Ubuntu or your WSL distribution)
2. **Install Node.js** (if not already installed):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
   Or check if Node.js is already installed:
   ```bash
   node --version
   ```

3. **Install Cloudron CLI:**
   ```bash
   npm install -g cloudron
   ```

**Note:** Make sure Docker Desktop is configured to use WSL 2 backend. You can verify Docker works in WSL:
```bash
docker --version
```

## Step 6: Login to Cloudron

```bash
cloudron login YOUR_CLOUDRON_DOMAIN
```

Replace `YOUR_CLOUDRON_DOMAIN` with your Cloudron instance domain (e.g., `cloudron.yourdomain.com`).

You'll be prompted for your Cloudron username and password.

## Step 7: Install the App on Cloudron

Use the Cloudron CLI to install your app:

```bash
cloudron install \
  --image YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest \
  -l baseball-scorer.YOUR_CLOUDRON_DOMAIN \
  --env UNLOCK_KEY=unlock \
  --env DIRECTUS_URL=https://your-directus.com \
  --env DIRECTUS_STATIC_TOKEN=your-token \
  --env DIRECTUS_SCOREKEEPER_TOKEN=your-token
```

**Replace:**
- `YOUR_DOCKERHUB_USERNAME` with your Docker Hub username
- `YOUR_CLOUDRON_DOMAIN` with your Cloudron domain (e.g., `yourdomain.com`)
- `https://your-directus.com` with your Directus URL (or leave empty if not using Directus)
- `your-token` with your actual tokens (or leave empty if not using Directus)

**Note:** 
- The `-l` (or `--location`) option sets the subdomain. You can use just the subdomain (e.g., `-l baseball-scorer`) and Cloudron will use your default domain, or specify the full domain.
- Environment variables are optional. You can omit the `--env` flags if you don't need them, or add them later in the Cloudron dashboard.

**Simplified version (without Directus):**
```bash
cloudron install \
  --image YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest \
  -l baseball-scorer
```

## Step 8: Access Your App

After installation completes, your app will be available at:
- **Main App**: `https://baseball-scorer.your-cloudron-domain.com`
- **Scoreboard Overlay**: `https://baseball-scorer.your-cloudron-domain.com/scoreboard`
- **Lower Thirds**: `https://baseball-scorer.your-cloudron-domain.com/batter-lower-thirds`
- **Linescore**: `https://baseball-scorer.your-cloudron-domain.com/linescore`

## Troubleshooting

### If push fails with authentication error:
- Make sure you're logged in: `docker login`
- Check your Docker Hub credentials

### If Cloudron can't pull the image:
- Verify the image name is correct (case-sensitive)
- Check that Cloudron has access to your private registry (configured in Cloudron dashboard)
- Try using the full format: `docker.io/YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest`
- For private registries, make sure you've configured Docker Hub access in Cloudron dashboard under Settings → Docker Registries

### If the app won't start:
- Check the app logs in Cloudron dashboard
- Verify environment variables are set correctly
- Make sure PORT is set (Cloudron sets this automatically)

## Updating the App Later

When you make changes:

1. **Rebuild:**
   ```bash
   docker build -t baseball-scorer:latest .
   docker tag baseball-scorer:latest YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest
   docker push YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest
   ```

2. **Update in Cloudron:**
   - Go to your app → Settings → Update
   - Enter: `YOUR_DOCKERHUB_USERNAME/baseball-scorer:latest`
   - Click Update

