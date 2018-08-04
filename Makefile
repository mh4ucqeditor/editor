APPFILES = $(shell find app -print)
NWVER = v0.28.3
APPNAME = editor

all: osx win linux

app/bower_components:
	cd app; bower install
	make cleanbower

nw: dist/$(APPNAME).nw

dist/$(APPNAME).nw: $(APPFILES) app/bower_components
	make cleanbower
	make cleands
	mkdir -p dist
	rm -f dist/$(APPNAME).nw;

	rm -rf build; cp -r app build

	find build/app -type f -name "*.js" -depth -exec echo uglifying {} \; -exec sh -c 'uglifyjs {} --mangle toplevel --compress -o "{}"' \;
	find build/app -type f -name "*.js" -depth -exec echo obfuscating {} \; -exec sh -c 'jsobfuscate {} > {}.obf' \;
	find build/app -type f -name "*.obf" -depth | sh -c 'while read f; do mv "$$f" "$${f%.obf}"; done'

	cd build; zip -r ../dist/$(APPNAME).nw * -x *.DS_Store
	rm -rf build
	cd etc; zip ../dist/$(APPNAME).nw package.json
	cd etc; zip ../dist/$(APPNAME).nw icon.png
	cp changelog.txt dist/


# OSX Build
osx: osx64
osx64: dist/$(APPNAME)-x64.app

zip:
	cd dist; zip -r $(APPNAME)-osx-x64.zip $(APPNAME)-x64.app; zip $(APPNAME)-osx-x64.zip changelog.txt
	cd dist; zip -r $(APPNAME)-win-ia32.zip win-ia32; zip $(APPNAME)-win-ia32.zip changelog.txt
	cd dist; zip -r $(APPNAME)-win-x64.zip win-x64; zip $(APPNAME)-win-x64.zip changelog.txt
	cd dist; zip -r $(APPNAME)-linux-ia32.zip linux-ia32; zip $(APPNAME)-linux-ia32.zip changelog.txt
	cd dist; zip -r $(APPNAME)-linux-x64.zip linux-x64; zip $(APPNAME)-linux-x64.zip changelog.txt
	cd dist; mkdir zips; mv *.zip zips/

dist/$(APPNAME)-%.app: dist/$(APPNAME).nw nwjs/nwjs-%.app etc/*
	rm -rf dist/$(APPNAME)-$*.app;
	cp -r nwjs/nwjs-$*.app dist/$(APPNAME)-$*.app
	cp dist/$(APPNAME).nw dist/$(APPNAME)-$*.app/Contents/Resources/app.nw
	cp etc/Info.plist dist/$(APPNAME)-$*.app/Contents/
	sips -s format icns etc/icon_big.png --out dist/$(APPNAME)-$*.app/Contents/Resources/nw.icns


# Download nwjs osx executables
nwjs/nwjs-%.app:
	mkdir -p nwjs
	curl -o nwjs/nwjs-osx-$*.zip https://dl.nwjs.io/$(NWVER)/nwjs-$(NWVER)-osx-$*.zip
	cd nwjs; unzip nwjs-osx-$*.zip; rm -f nwjs-osx-$*.zip
	mv nwjs/nwjs-$(NWVER)-osx-$*/nwjs.app nwjs/nwjs-$*.app
	rm -rf nwjs/nwjs-$(NWVER)-osx-$*

# Windows Build
win: win32 win64
win32: dist/win-ia32/$(APPNAME).exe
win64: dist/win-x64/$(APPNAME).exe

dist/win-%/$(APPNAME).exe: dist/$(APPNAME).nw nwjs/win-% etc/*
	mkdir -p dist/win-$*
	rm -rf dist/$(APPNAME)-$*;
	cat nwjs/win-$*/nw.exe dist/$(APPNAME).nw > dist/win-$*/$(APPNAME).exe
	cp nwjs/win-$*/*.dll dist/win-$*/
	cp nwjs/win-$*/icudtl.dat dist/win-$*/
	cp nwjs/win-$*/resources.pak dist/win-$*/
	cp nwjs/win-$*/libEGL.dll dist/win-$*/
	cp nwjs/win-$*/libGLESv2.dll dist/win-$*/
	cp nwjs/win-$*/d3dcompiler_47.dll dist/win-$*/

	upx dist/win-$*/$(APPNAME).exe

# Download nwjs win executables
nwjs/win-%:
	mkdir -p nwjs
	curl -o nwjs/nwjs-win-$*.zip https://dl.nwjs.io/$(NWVER)/nwjs-$(NWVER)-win-$*.zip
	cd nwjs; unzip nwjs-win-$*.zip; rm nwjs-win-$*.zip;
	mv nwjs/nwjs-$(NWVER)-win-$* nwjs/win-$*

# Linux Build
linux: linux32 linux64
linux32: dist/linux-ia32/$(APPNAME)
linux64: dist/linux-x64/$(APPNAME)

dist/linux-%/$(APPNAME): dist/$(APPNAME).nw nwjs/linux-% etc/*
	mkdir -p dist/linux-$*
	rm -rf dist/$(APPNAME)-$*;
	cat nwjs/linux-$*/nw dist/$(APPNAME).nw > dist/linux-$*/$(APPNAME) && chmod +x dist/linux-$*/$(APPNAME)
	cp nwjs/linux-$*/icudtl.dat dist/linux-$*/
	cp nwjs/linux-$*/nw.pak dist/linux-$*/
	upx dist/linux-$*/$(APPNAME)

# Download nwjs linux executables
nwjs/linux-%:
	mkdir -p nwjs
	curl -o nwjs/nwjs-linux-$*.tar.gz https://dl.nwjs.io/$(NWVER)/nwjs-$(NWVER)-linux-$*.tar.gz
	cd nwjs; tar -xvf nwjs-linux-$*.tar.gz; rm nwjs-linux-$*.tar.gz;
	mv nwjs/nwjs-$(NWVER)-linux-$* nwjs/linux-$*



# delete unecessary bower_components
cleanbower:
	find app/bower_components -type d -name "src" -depth -exec rm -rf {} \;
	find app/bower_components -type d -name "tasks" -depth -exec rm -rf {} \;
	find app/bower_components -type d -name "examples" -depth -exec rm -rf {} \;
	find app/bower_components -type d -name "components" -depth -exec rm -rf {} \;
	find app/bower_components -type f -name "*.example" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "*.md" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "*.txt" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "*.json" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "*.gzip" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "*.map" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "*-csp.js" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "index.js" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "logo.png" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "gulpfile.js" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "karma.conf.js" -depth -exec rm -f {} \;

	find app/bower_components -type f -name "angular.js" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "angular-route.js" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "jquery.js" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "semantic.js" -depth -exec rm -f {} \;
	find app/bower_components -type f -name "semantic.css" -depth -exec rm -f {} \;
	# remove sourceMapping
	find app/bower_components -type f -name "*.min.js" -depth -exec sed -i '' '/sourceMappingURL/d' {} \;
	# remove googlefont import
	sed -i '' 's/\@import url(https.*latin);//' app/bower_components/semantic-ui/dist/semantic.min.css


# delete .DS_Store files recursively
cleands:
	find . -name ".DS_Store" -depth -exec rm {} \;

.PRECIOUS: nwjs/nwjs-%.app nwjs/win-% nwjs/linux-%
