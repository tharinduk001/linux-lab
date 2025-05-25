# Use Ubuntu as the base image
FROM ubuntu:latest

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install necessary packages
RUN apt-get update && apt-get install -y \
    bash \
    coreutils \
    procps \
    nano \
    iproute2 \
    util-linux \
    --no-install-recommends && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user 'student'
RUN useradd -m -s /bin/bash student
USER student
WORKDIR /home/student

# Set a simple PS1 prompt for the student user
RUN echo 'export PS1="\\u@\\h:\\w\\$ "' >> /home/student/.bashrc

# Default command (can be overridden)
CMD ["/bin/bash"]
