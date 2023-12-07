export const htmlDecode = (input: string) => {
  var doc = new DOMParser().parseFromString(input, 'text/html');
  return doc.documentElement.textContent || '';
};

export function chunk<T>(input: Array<T>, size: number) {
  return input.reduce((arr, item, idx) => {
    return idx % size === 0 ? [...arr, [item]] : [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
  }, [] as Array<Array<T>>);
}

export const map = (arr: Array<any>, fn: (value: any, index: number, array: Array<any>) => unknown) =>
  arr.map(fn).join('');
