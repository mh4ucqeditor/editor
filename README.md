# MH4U Custom Quest Editor

## Installing Dependencies
First install all dependencies with:

```sudo npm install -g bower js-obfuscator uglify-js```

Then install bower dependencies with (in the `app` folder):

```bower install```

## Running the app
Download [nw.js](http://nwjs.io)

For convenience create an alias in your bash_profile

```alias nw="/Applications/nwjs.app/Contents/MacOS/nwjs"```

Then run the app with:

```nw app```

## Architecture
ID references for monsters, items, etc. go into

```app/utils/constants.js```

Other stuff that is not directly visible goes into

```app/utils```

Actual visible controller and templates sorted in subdirectories go into

```app/views```


## Building
To build for all platforms run:

```make```

To build for a specific platform run any of these:

```
make osx
make osx32
make osx64

make win
make win32
make win64

make linux
make linux32
make linux64
```

## Notes:
- the package.json for the build will be replaced by ```etc/package.json```
- the app icon is derived from ```etc/icon.png```
- for OSX additional app settings can be configured in ```etc/Info.plist```
- Windows and Linux build requires upx to be installed
