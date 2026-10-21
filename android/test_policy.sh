#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
POLICY_JAVAC="${BEEHIVE_JAVA_HOME:+$BEEHIVE_JAVA_HOME/bin/}javac"
POLICY_JAVA="${BEEHIVE_JAVA_HOME:+$BEEHIVE_JAVA_HOME/bin/}java"
POLICY_OUT="$(mktemp -d "${TMPDIR:-/tmp}/beehive-policy.XXXXXX")"
trap 'rm -rf "$POLICY_OUT"' EXIT
"$POLICY_JAVAC" --release 11 -d "$POLICY_OUT" \
  "$HERE/src/is/eightb/beehive/WebViewPolicy.java" \
  "$HERE/test/is/eightb/beehive/WebViewPolicyTest.java"
"$POLICY_JAVA" -Xmx128m -cp "$POLICY_OUT" is.eightb.beehive.WebViewPolicyTest
