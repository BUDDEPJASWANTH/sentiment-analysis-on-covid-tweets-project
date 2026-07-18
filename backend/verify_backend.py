import os
import sys
import traceback
print('cwd before', os.getcwd())
os.chdir(r'C:\Users\JASWA\OneDrive\Documents\Projects\sentiment  analysis on covid tweets project\backend')
print('cwd after', os.getcwd())
try:
    import main
    print('imported', main.app.title)
except Exception as e:
    traceback.print_exc()
    sys.exit(1)
