import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('calculator.js', 'rb') as f:
    content = f.read()

# The corrupted sequence is a triple-encoded U+00BD (½)
# Original ½ -> UTF-8: \xc2\xbd
# Each encoding round doubles the bytes as Latin-1 -> UTF-8
# Current bytes: \xc3\x83\xc6\x92\xc3\x82\xc2\xaf\xc3\x83\xe2\x80\x9a\xc3\x82\xc2\xbf\xc3\x83\xe2\x80\x9a\xc3\x82\xc2\xbd
# This is the triple-encded: ½ -> Â½ -> Ã‚Â½ -> ÃƒÂ¯Ã‚Â¿Ã‚Â½

# The corrupted sequence as bytes (each ½ became this 18-byte monstrosity):
corrupted = b'\xc3\x83\xc6\x92\xc3\x82\xc2\xaf\xc3\x83\xe2\x80\x9a\xc3\x82\xc2\xbf\xc3\x83\xe2\x80\x9a\xc3\x82\xc2\xbd'

count = content.count(corrupted)
print(f'Found {count} corrupted sequences')

if count > 0:
    # Replace with middle dot (·) which is commonly used as separator
    content = content.replace(corrupted, b'\xc2\xb7')
    print(f'Replaced {count} sequences with middle dot (·)')
    
    with open('calculator.js', 'wb') as f:
        f.write(content)
    print('File saved')
else:
    # Try shorter variants
    for name, pat in [
        ('double-enc Ã‚Â½', b'\xc3\x82\xc2\xbd'),
        ('single-enc ½', b'\xc2\xbd'),
        ('broken ï¿½', b'\xef\xbf\xbd'),
    ]:
        c = content.count(pat)
        print(f'  {name}: {c} occurrences')
