FROM gochewy/gitpod-workspace:v0.1.5

RUN echo "export PATH=$PATH:/workspace/chewy-global/contributor-cli/bin:/workspace/chewy-global/cli/bin" >> ~/.bashrc
ENV IS_CHEWY_CONTRIBUTOR=true
