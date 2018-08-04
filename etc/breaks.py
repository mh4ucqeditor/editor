import json

f = open('breaks.csv')
content = f.read()
f.close()

data = {}
for line in content.split('\r\n'):
    item = line.split(',')
    # data[item[0]] = dict(zip((0, 1, 2, 3, 4, 5, 6, 7), item[2:]))
    if len(item) == 1:
        continue
    data[item[0]] = {}
    for i in xrange(8):
        if item[2 + i] != '---':
            data[item[0]][i] = item[2 + i]

print json.dumps(data, indent=4, sort_keys=True)
