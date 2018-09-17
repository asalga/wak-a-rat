#!/bin/sh
# production build shell script to save keystrokes!

git add . && \
git commit -m'making prod build.' && \
git co gh-pages && \
git merge master --no-commit && \
grunt prod && \
git add . && \
git commit -m"prod build" && \
git push && \
git co master