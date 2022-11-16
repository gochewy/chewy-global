FROM gochewy/gitpod-workspace:v0.1.2

RUN echo "export PATH=$PATH:/workspace/chewy-global/contributor-cli/bin" >> ~/.bashrc
RUN echo "export PATH=$PATH:/workspace/chewy-global/cli/bin" >> ~/.bashrc
