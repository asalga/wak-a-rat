git co gh-pages && \
git merge master && \
grunt prod && \
git add . && \
git commit -m"prod build" && \
git push
