FROM gochewy/gitpod-workspace:v0.1.2

RUN touch ~/.bashrc
RUN echo "export PATH=$PATH:/workspace/chewy-global/chewy-contributor-cli/bin" >> ~/.bashrc