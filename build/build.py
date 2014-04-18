#!/usr/bin/python

import os.path
import sys
import re
from httplib2 import Http
from urllib import urlencode

# cd to the script directory
try: __file__
except NameError:
    basepath = '/Users/andreivarabyou/Documents/git/picEdit/build/'
else:
    basepath = os.path.dirname(__file__)
if basepath != "":
    os.chdir(basepath)

# loads sources from the disk
file = open("../src/index.html", "r")
src_html = file.read()
file.close()
file = open("../src/js/picedit.js", "r")
src_js = file.read()
file.close()

# extract html code
phtm = re.compile(r'<!-- begin_picedit_box -->.+<!-- end_picedit_box -->', re.IGNORECASE | re.DOTALL)
pouthtm = re.findall(phtm, src_html)

# minify the html
url = 'http://www.willpeavy.com/minifier/'   
body = {'html': pouthtm[0]}
headers = {'Content-type': 'application/x-www-form-urlencoded'}
http = Http()
resp, content = http.request(url, "POST", headers=headers, body=urlencode(body))
outhtml = re.findall('(<textarea.+?>)(.+?)(</textarea)', content)

#comment and uncomment source and dist code
unc = re.compile('(\/\*unhide_in_prod\*\/.*?)(\/\*)(.+?)(\*\/)(.*\/\*unhide_in_prod\*\/)', re.IGNORECASE | re.DOTALL)
src_js = unc.sub(r'\1 \3 \5', src_js)
unc = re.compile('(\/\*hide_in_prod\*\/)(.+)(\/\*hide_in_prod\*\/)', re.IGNORECASE | re.DOTALL)
src_js = unc.sub(r'\1 /* \2 */ \3', src_js)

#apply compiled html
unc = re.compile('compiled_template_markup', re.DOTALL)
src_js = unc.sub(outhtml[0][1], src_js)

#save pre-processed js to the dist folder
file = open("../dist/js/picedit.js", "w")
file.write(src_js)
file.close()