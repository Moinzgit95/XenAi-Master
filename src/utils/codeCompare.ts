export interface CodeDiff {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function compareCode(oldCode: string, newCode: string): CodeDiff[] {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const diffs: CodeDiff[] = [];

  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diffs.push({ value: oldLines[i] });
      i++;
      j++;
    } else if (j < newLines.length) {
      diffs.push({ value: newLines[j], added: true });
      j++;
    } else if (i < oldLines.length) {
      diffs.push({ value: oldLines[i], removed: true });
      i++;
    }
  }

  return diffs;
}