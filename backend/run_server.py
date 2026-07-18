import os
import sys
os.chdir(r"C:\Users\JASWA\OneDrive\Documents\Projects\sentiment  analysis on covid tweets project\backend")
import uvicorn
import main
print('starting')
uvicorn.run(main.app, host='127.0.0.1', port=8000, log_level='info')
