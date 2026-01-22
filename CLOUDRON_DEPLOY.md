# Deploying Baseball Scoreboard to Cloudron.io

This guide will help you deploy the Baseball Scoreboard app to your Cloudron instance.

## Prerequisites

- A Cloudron instance running (see [Cloudron Installation](https://docs.cloudron.io/installation/))
- Docker installed on your local machine
- Access to your Cloudron instance's Docker registry

## Step 1: Prepare Your Code

1. **Ensure all files are committed:**
   ```bash
   git add .
   git commit -m "Prepare for Cloudron deployment"
   ```

2. **Make the build script executable (if on Linux/Mac):**
   ```bash
   chmod +x build-cloudron.sh
   ```

## Step 2: Build the Docker Image

1. **Build the Docker image:**
   ```bash
   docker build -t baseball-scorer:latest .
   ```

2. **Test the image locally (optional):**
   ```bash
   docker run -p 3000:3000 \
     -e PORT=3000 \
     -e UNLOCK_KEY=unlock \
     baseball-scorer:latest
   ```
   
   Then visit `http://localhost:3000` to verify it works.

## Step 3: Push to Cloudron Registry

1. **Tag the image for your Cloudron registry:**
   ```bash
   docker tag baseball-scorer:latest your-cloudron-domain.com:5000/baseball-scorer:latest
   ```

2. **Login to Cloudron registry:**
   ```bash
   docker login your-cloudron-domain.com:5000
   ```
   Use your Cloudron admin credentials.

3. **Push the image:**
   ```bash
   docker push your-cloudron-domain.com:5000/baseball-scorer:latest
   ```

## Step 4: Install on Cloudron

### Option A: Using Cloudron Web UI

1. Log into your Cloudron dashboard
2. Go to **Apps** → **Install App**
3. Select **Custom App**
4. Choose **From Docker Image**
5. Enter: `your-cloudron-domain.com:5000/baseball-scorer:latest`
6. Fill in app details:
   - **App ID**: `baseball-scorer`
   - **Title**: `Baseball Scoreboard`
   - **Description**: `A real-time baseball scoring application with live scoreboard overlay for streaming`
7. Click **Next**
8. Configure environment variables (all optional):
   - `UNLOCK_KEY`: Password to unlock the app (default: "unlock")
   - `DIRECTUS_URL`: Your Directus instance URL (e.g., `https://your-directus.com`)
   - `DIRECTUS_STATIC_TOKEN`: Directus admin/static token
   - `DIRECTUS_SCOREKEEPER_TOKEN`: Directus scorekeeper user token
9. Click **Install**

### Option B: Using Cloudron CLI

1. **Install Cloudron CLI** (if not already installed):
   ```bash
   npm install -g cloudron
   ```

2. **Login to Cloudron:**
   ```bash
   cloudron login your-cloudron-domain.com
   ```

3. **Install the app:**
   ```bash
   cloudron install \
     --image your-cloudron-domain.com:5000/baseball-scorer:latest \
     --app baseball-scorer \
     --title "Baseball Scoreboard" \
     --env UNLOCK_KEY=unlock \
     --env DIRECTUS_URL=https://your-directus.com \
     --env DIRECTUS_STATIC_TOKEN=your-token \
     --env DIRECTUS_SCOREKEEPER_TOKEN=your-token
   ```

## Step 5: Access Your App

After installation, your app will be available at:
- **Main App**: `https://baseball-scorer.your-cloudron-domain.com`
- **Scoreboard Overlay**: `https://baseball-scorer.your-cloudron-domain.com/scoreboard`
- **Lower Thirds Overlay**: `https://baseball-scorer.your-cloudron-domain.com/batter-lower-thirds`
- **Linescore Overlay**: `https://baseball-scorer.your-cloudron-domain.com/linescore`

## Step 6: Configure Environment Variables

After installation, you can update environment variables in the Cloudron dashboard:

1. Go to your app in Cloudron
2. Click **Settings** → **Environment Variables**
3. Update any variables as needed
4. Click **Save** (app will restart automatically)

## Updating the App

To update the app with new code:

1. **Build a new image:**
   ```bash
   docker build -t baseball-scorer:v1.0.1 .
   docker tag baseball-scorer:v1.0.1 your-cloudron-domain.com:5000/baseball-scorer:v1.0.1
   docker push your-cloudron-domain.com:5000/baseball-scorer:v1.0.1
   ```

2. **Update in Cloudron:**
   - **Web UI**: Go to app → **Settings** → **Update** → Enter new image tag
   - **CLI**: `cloudron update --app baseball-scorer --image your-cloudron-domain.com:5000/baseball-scorer:v1.0.1`

## Troubleshooting

### App won't start
- Check the app logs in Cloudron dashboard
- Verify the Docker image was built correctly
- Ensure PORT environment variable is set (Cloudron sets this automatically)

### Environment variables not working
- Environment variables are available at runtime, not build time
- The app reads from `process.env` which Cloudron provides
- Check Cloudron app settings to verify variables are set

### Build fails
- Ensure Node.js 20+ is available in the build environment
- Check that all dependencies are listed in `package.json`
- Review Docker build logs for specific errors

### Static files not loading
- Verify the `dist` directory is being copied correctly in Dockerfile
- Check that the server.js is serving from the correct directory
- Review server logs for file access errors

## Notes

- The app uses Cloudron's automatic HTTPS/SSL certificates
- All environment variables are optional - the app works without them
- The app stores game state in browser localStorage (no database required)
- For production use, consider setting a strong `UNLOCK_KEY`



