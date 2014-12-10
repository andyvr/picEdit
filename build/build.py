#!/usr/bin/python

import os.path
import sys
import re
from httplib2 import Http
from urllib import urlencode

def main():
    # cd to the script directory
    try: __file__
    except NameError:
        basepath = '/Users/andreivarabyou/Documents/git/picEdit/build/'
    else:
        basepath = os.path.dirname(__file__)
    if basepath != "":
        os.chdir(basepath)
    compile_html()
    compile_css()
    compile_js()
    
def compile_js():
    file = open("../dist/js/picedit.js", "r")
    src_js = file.read()
    file.close()
    # get the plugin description
    title = re.compile(r'^\/\*.+?\*\/', re.DOTALL | re.IGNORECASE)
    title = re.findall(title, src_js)
    # minify the js
    url = 'http://javascript-minifier.com/raw'   
    body = {'input': src_js}
    headers = {'Content-type': 'application/x-www-form-urlencoded'}
    http = Http()
    resp, content = http.request(url, "POST", headers=headers, body=urlencode(body))
    file = open("../dist/js/picedit.min.js", "w")
    file.write(title[0] + "\n" + content)
    file.close()

def compile_css():
    # concatenate styles and save destination unminified
    file = open("../src/css/font.css", "r")
    src_style1 = file.read()
    file.close()
    file = open("../src/css/picedit.css", "r")
    src_style2 = file.read()
    file.close()
    file = open("../dist/css/picedit.css", "w")
    css_source = src_style1 + "\n" + src_style2
    file.write(css_source)
    file.close()
    # minify the css
    url = 'http://cssminifier.com/raw'   
    body = {'input': css_source}
    headers = {'Content-type': 'application/x-www-form-urlencoded'}
    http = Http()
    resp, content = http.request(url, "POST", headers=headers, body=urlencode(body))
    file = open("../dist/css/picedit.min.css", "w")
    file.write(content)
    file.close()

def compile_html():
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
    
# run the main function
if __name__ == "__main__":
    main()