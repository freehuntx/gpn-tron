const crc32=function(r){for(var a,o=[],c=0;c<256;c++){a=c;for(var f=0;f<8;f++)a=1&a?3988292384^a>>>1:a>>>1;o[c]=a}for(var n=-1,t=0;t<r.length;t++)n=n>>>8^o[255&(n^r.charCodeAt(t))];return(-1^n)>>>0};

export const getColor = (n: number) => {
  const rgb = [0, 0, 0];

  for (let i = 0; i < 24; i++) {
    rgb[i%3] <<= 1;
    rgb[i%3] |= n & 0x01;
    n >>= 1;
  }

  return '#' + rgb.reduce((a, c) => (c > 0x0f ? c.toString(16) : '0' + c.toString(16)) + a, '')
}

export const getColorByString = (str: string) => {
  return '#' + ('000000' + crc32(str).toString(16)).slice(-6)
}
