// tiny word-diff: LCS over tokens (words + whitespace)
function tokenize(s: string): string[] {
  return s.split(/(\s+)/);
}

export function wordDiff(aText: string, bText: string) {
  const A = tokenize(aText), B = tokenize(bText);
  const m = A.length, n = B.length;

  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const aTokens: Array<{ t: string; del?: boolean }> = [];
  const bTokens: Array<{ t: string; ins?: boolean }> = [];
  let i = 0, j = 0;

  while (i < m && j < n) {
    if (A[i] === B[j]) {
      aTokens.push({ t: A[i] });
      bTokens.push({ t: B[j] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      aTokens.push({ t: A[i], del: true });
      i++;
    } else {
      bTokens.push({ t: B[j], ins: true });
      j++;
    }
  }
  while (i < m) aTokens.push({ t: A[i++], del: true });
  while (j < n) bTokens.push({ t: B[j++], ins: true });

  return { aTokens, bTokens };
}
