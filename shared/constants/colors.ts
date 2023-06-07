function getColorArray(num: number) {
  var result = [];
  for (var i = 0; i < num; i += 1) {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var j = 0; j < 6; j += 1) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    result.push(color);
  }
  return result;
}

export const colors = getColorArray(100)

export const getColor = (num: number) => colors[num % colors.length]