# Creating recipe for `uvloop`

Hi! Today we will try to create a p4a recipe for [uvloop](https://github.com/MagicStack/uvloop).
Today As usual I was checking `python-for-android`'s github and found [this issue](https://github.com/kivy/python-for-android/issues/2997).
OP was requesting for `uvloop` recipe, saying "*improved the performance...*" so I thought to give it a try.

I started with checking the [uvloop](https://github.com/MagicStack/uvloop)'s github and saw this:

![image](https://github.com/T-Dynamos/t-dynamos.github.io/assets/68729523/1bc8a602-d805-49c3-9717-20b61efbccf9)

It's a good thing as p4a already have `CythonRecipe` support. So Let's start cooking!


### Step 1 : Build on your system

First step to cook any recipe is to first download and try build source code on your system.
I ran:

```console
git clone https://github.com/MagicStack/uvloop --depth 1
cd uvloop
```
View source code files tree:
```
❯ ls
dist  examples        LICENSE-MIT  MANIFEST.in  performance.png  README.rst  tests   vendor
docs  LICENSE-APACHE  Makefile     mypy.ini     pyproject.toml   setup.py    uvloop  
```

As you can see it's normal files for a python project. Then I opened `pyproject.toml` and saw:
```toml
[build-system]
requires = [
    "setuptools>=60",
    "wheel",
    "Cython(>=0.29.36,<0.30.0)",
]
build-backend = "setuptools.build_meta"
```
This tells the correct cython and setuptools version required to build. After that I just ran:
```console
# better than running `python3 setup.py build_ext`
# as it automatically creates venv and fetch build deps.
python3 -m build
```
Here comes the first error:
```
RuntimeError: the libuv submodule has not been checked out; try running "git submodule init; git submodule update"

ERROR Backend subprocess exited when trying to invoke build_sdist
```
It's a very normal error, saying to fetch submodules. Can be fixed by running:

```console
git submodule init; git submodule update
```

This concludes two things:
1. We can't use source from github releases as it won't contain submodules.
2. We need to use git url for p4a and specify version to a commit hash.

After fixing this error, it successfully builds on my system.

### Step 2: Create recipe

Start by forking p4a then create a new branch:
![image](https://github.com/T-Dynamos/t-dynamos.github.io/assets/68729523/1e30c706-8bce-4865-a2b7-e72081b7a594)

After that, clone it to your system:
```console
git clone https://github.com/T-Dynamos/python-for-android/ --depth 1 --branch uvloop uvloop_recipe
```
Make recipe dir:
```console
mkdir pythonforandroid/recipes/uvloop
```
Then open file: `pythonforandroid/recipes/uvloop/__init__.py`, this is what I wrote:
```python
from pythonforandroid.recipe import CythonRecipe


class UvloopRecipe(CythonRecipe):
    # 0.19.0
    version = '6c770dc3fbdd281d15c2ad46588c139696f9269c'
    url = 'git+https://github.com/MagicStack/uvloop'
    depends = ['cython', 'setuptools']


recipe = UvloopRecipe()
```

Here the version I choose was from uvloop's github:

![image](https://github.com/T-Dynamos/t-dynamos.github.io/assets/68729523/91e5e94d-911d-4685-84db-8884c4e16cfc)

For git dirs you need to add `git+` as prefix in source. Now we are good to go for testing this recipe.

# Step 3: Test the recipe

Make a new directory, add test `main.py` file which will test your recipe (in this case I took example from their github readme). 
Then I assume you know about buildozer, run `buildozer init` and then edit `buildozer.spec` file:
```spec
requirements = python3, uvloop
p4a.source_dir =  /home/tdynamos/git/uvloop/ # path to your p4a fork
android.archs = armeabi-v7a # just try build for single one
```
then run `buildozer android debug`, and pray. Obviously it never works at first try:
```
[DEBUG]:   	configure: error: cannot run C compiled programs.
[DEBUG]:   	If you meant to cross compile, use '--host'.
[DEBUG]:   	See 'config.log' for more details
```
As it also compiles `libuv` which is a c library, we need to do some extra things.
See error says `use '--host'`. I went in `setup.py` of `uvloop` and saw:
```python
        if 'LIBUV_CONFIGURE_HOST' in env:
            cmd = ['./configure', '--host=' + env['LIBUV_CONFIGURE_HOST']]
        else:
            cmd = ['./configure']
```
Because of this we need to add this function to our `__init__.py`:
```python
    def get_recipe_env(self, arch):
        env = super().get_recipe_env(arch)
        env["LIBUV_CONFIGURE_HOST"] = arch.command_prefix
        return env
```
Then I reran. Next errors were like:
```
[DEBUG]:   	Error compiling Cython file:
[DEBUG]:   	------------------------------------------------------------
[DEBUG]:   	...
[DEBUG]:   	
[DEBUG]:   	   cdef _na(self, what):
[DEBUG]:   	       raise TypeError('transport sockets do not support {}'.format(what))
[DEBUG]:   	
[DEBUG]:   	   cdef _make_sock(self):
[DEBUG]:   	       return socket_socket(self._family, self._type, self._proto, self._fd)
[DEBUG]:   	              ^
[DEBUG]:   	------------------------------------------------------------
[DEBUG]:   	
[DEBUG]:   	uvloop/pseudosock.pyx:22:15: undeclared name not builtin: socket_socket
```
I think here `CythonRecipe` messed up. So I switched to `CompiledComponentsPythonRecipe`.
Another error:
```
[INFO]:    Building compiled components in uvloop
[INFO]:    -> directory context /home/tdynamos/Expreiments/PythonTest/.buildozer/android/platform/build-armeabi-v7a/build/other_builds/uvloop/armeabi-v7a__ndk_target_21/uvloop
[DEBUG]:   -> running python3 setup.py build_ext -v
[DEBUG]:   	Traceback (most recent call last):
[DEBUG]:   	 File "/home/tdynamos/Expreiments/PythonTest/.buildozer/android/platform/build-armeabi-v7a/build/other_builds/uvloop/armeabi-v7a__ndk_target_21/uvloop/setup.py", line 19, in <module>
[DEBUG]:   	   from setuptools import setup, Extension
[DEBUG]:   	ModuleNotFoundError: No module named 'setuptools'
```
This is probably because I didn't set `call_hostpython_via_targetpython` to false. Then again I reran.
Next error:
```
ld: error: unable to find library -lrt
ld: error: unable to find library -lpthread
clang-14: error: linker command failed with exit code 1 (use -v to see invocation)
error: command '/home/tdynamos/.buildozer/android/platform/android-ndk-r25b/toolchains/llvm/prebuilt/linux-x86_64/bin/clang' failed with exit code 1
```
p4a also has a `LibRt` recipe I added it to depends and reran.
Now `-lrt` line error disappeared:
```
ld: error: unable to find library -lpthread
```
[Quick stackoverflow](https://stackoverflow.com/questions/30801752/android-ndk-and-pthread) suggests that:
> The android libc, bionic, provides built-in support for pthreads, so no
additional linking (-lpthreads) is necessary


But I don't want to do patching, So I searched for `libuv` in [`termux-packages`](https://github.com/termux/termux-packages/blob/master/packages/libuv/build.sh).
And found this in `build.sh`:

```bash
termux_step_pre_configure() {
	export PLATFORM=android
	sh autogen.sh
}
```

This means we need to add `PLATFORM=android` in recipe env:
```python
env["PLATFORM"] = "android"
```
Nevermind, I ran it, It does not works. Next I approach I tried was create a same
recipe as librt for libpthread, and I did it by just copy, pasting and replacing
librt to libpthread. And now for running the build, I have to force buildozer to rebuild
that particular recipe. Here is what I use for clean:


```
cd ./.buildozer/ 
find -name "*uvloop*" -exec rm -rf {} +
rm -rf ./android/platform/build-armeabi-v7a/dists/myapp/dist_info.json
```

This delete's all the files related to recipe and force rebuild.
And guess what it works!

So here is the final recipe:
```python3
from pythonforandroid.recipe import PythonRecipe


class UvloopRecipe(PythonRecipe):
    # 0.19.0
    version = '6c770dc3fbdd281d15c2ad46588c139696f9269c'
    url = 'git+https://github.com/MagicStack/uvloop'
    depends = ['cython', 'setuptools', 'librt', 'libpthread']
    call_hostpython_via_targetpython = False

    def get_recipe_env(self, arch):
        env = super().get_recipe_env(arch)
        env["LIBUV_CONFIGURE_HOST"] = arch.command_prefix
        env["PLATFORM"] = "android"
        return env


recipe = UvloopRecipe()
```

[Click here to see PR](https://github.com/kivy/python-for-android/pull/2998)

**Total time took to cook this recipe**: `6hrs`

If you have any questions please come on [kivy's discord](https://chat.kivy.org/), `python-for-android` section.
