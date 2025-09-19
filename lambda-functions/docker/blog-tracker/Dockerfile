# AWS Lambda base image for Node.js 18
FROM public.ecr.aws/lambda/nodejs:18

# Install system dependencies for Chromium
RUN yum install -y \
    atk \
    cups-libs \
    gtk3 \
    libXcomposite \
    libXcursor \
    libXdamage \
    libXext \
    libXi \
    libXrandr \
    libXScrnSaver \
    libXtst \
    pango \
    at-spi2-atk \
    libXt \
    xorg-x11-server-Xvfb \
    xorg-x11-xauth \
    dbus-glib \
    dbus-libs \
    nss \
    nspr \
    alsa-lib \
    libdrm \
    libgbm \
    libxshmfence \
    && yum clean all

# Install additional fonts for better rendering
RUN yum install -y \
    google-noto-sans-cjk-fonts \
    google-noto-serif-cjk-fonts \
    && yum clean all

# Set up working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy package files
COPY package*.json ./

# Install Node.js dependencies including Chromium
RUN npm ci --production

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy application code
COPY index.js ./

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV HOME=/tmp

# Set the CMD to your handler
CMD [ "index.handler" ]