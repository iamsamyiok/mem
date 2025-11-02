import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import hashlib
import os
import json

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 文件存储目录
FILES_DIR = 'files'
if not os.path.exists(FILES_DIR):
    os.makedirs(FILES_DIR)

# 初始化数据库
def init_db():
    conn = sqlite3.connect('notes.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            time TEXT NOT NULL
        )
    ''')
    
    # 创建密码表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            password_hash TEXT NOT NULL
        )
    ''')
    
    # 检查是否已有密码，如果没有则设置初始密码
    cursor.execute('SELECT COUNT(*) FROM settings')
    count = cursor.fetchone()[0]
    if count == 0:
        # 初始密码为15378
        password_hash = hashlib.md5('15378'.encode()).hexdigest()
        cursor.execute('INSERT INTO settings (password_hash) VALUES (?)', (password_hash,))
    
    conn.commit()
    conn.close()

# 验证密码
def verify_password(password):
    conn = sqlite3.connect('notes.db')
    cursor = conn.cursor()
    cursor.execute('SELECT password_hash FROM settings WHERE id = 1')
    result = cursor.fetchone()
    conn.close()
    
    if result:
        password_hash = hashlib.md5(password.encode()).hexdigest()
        return password_hash == result[0]
    return False

# 创建笔记
@app.route('/api/note', methods=['POST'])
def create_note():
    # 验证密码
    data = request.get_json()
    password = data.get('password')
    if not verify_password(password):
        return jsonify({'status': 'error', 'msg': '密码错误'}), 401
    
    title = data.get('title')
    content = data.get('content')
    
    if not title or not content:
        return jsonify({'status': 'error', 'msg': '标题和内容不能为空'}), 400
    
    time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    conn = sqlite3.connect('notes.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO notes (title, content, time) VALUES (?, ?, ?)', 
                   (title, content, time))
    note_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'success', 'id': note_id})

# 获取所有笔记
@app.route('/api/notes', methods=['GET'])
def get_notes():
    # 验证密码
    password = request.args.get('password')
    if not verify_password(password):
        return jsonify({'status': 'error', 'msg': '密码错误'}), 401
    
    conn = sqlite3.connect('notes.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, content, time FROM notes ORDER BY time DESC')
    notes = cursor.fetchall()
    conn.close()
    
    notes_list = []
    for note in notes:
        notes_list.append({
            'id': note[0],
            'title': note[1],
            'content': note[2],
            'time': note[3]
        })
    
    return jsonify({'notes': notes_list})

# 获取单条笔记
@app.route('/api/note/<int:note_id>', methods=['GET'])
def get_note(note_id):
    # 验证密码
    password = request.args.get('password')
    if not verify_password(password):
        return jsonify({'status': 'error', 'msg': '密码错误'}), 401
    
    conn = sqlite3.connect('notes.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, content, time FROM notes WHERE id = ?', (note_id,))
    note = cursor.fetchone()
    conn.close()
    
    if note:
        return jsonify({
            'id': note[0],
            'title': note[1],
            'content': note[2],
            'time': note[3]
        })
    else:
        return jsonify({'status': 'error', 'msg': '不存在'}), 404

# 修改密码端点
@app.route('/api/change_password', methods=['POST'])
def change_password():
    data = request.get_json()
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    
    if not verify_password(old_password):
        return jsonify({'status': 'error', 'msg': '原密码错误'}), 401
    
    if not new_password:
        return jsonify({'status': 'error', 'msg': '新密码不能为空'}), 400
    
    # 更新密码
    conn = sqlite3.connect('notes.db')
    cursor = conn.cursor()
    new_password_hash = hashlib.md5(new_password.encode()).hexdigest()
    cursor.execute('UPDATE settings SET password_hash = ? WHERE id = 1', (new_password_hash,))
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'success', 'msg': '密码修改成功'})

# 删除笔记端点
@app.route('/api/note/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    # 验证密码
    password = request.args.get('password')
    if not verify_password(password):
        return jsonify({'status': 'error', 'msg': '密码错误'}), 401
    
    conn = sqlite3.connect('notes.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM notes WHERE id = ?', (note_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'success', 'msg': '笔记删除成功'})

# 获取文件列表
@app.route('/api/files', methods=['GET'])
def get_files():
    # 验证密码
    password = request.args.get('password')
    if not verify_password(password):
        return jsonify({'status': 'error', 'msg': '密码错误'}), 401
    
    try:
        files = []
        for filename in os.listdir(FILES_DIR):
            file_path = os.path.join(FILES_DIR, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append({
                    'name': filename,
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                })
        return jsonify({'status': 'success', 'files': files})
    except Exception as e:
        return jsonify({'status': 'error', 'msg': str(e)}), 500

# 上传文件
@app.route('/api/file', methods=['POST'])
def upload_file():
    # 验证密码
    password = request.form.get('password')
    if not verify_password(password):
        return jsonify({'status': 'error', 'msg': '密码错误'}), 401
    
    try:
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'msg': '没有文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'status': 'error', 'msg': '没有选择文件'}), 400
        
        if file:
            file.save(os.path.join(FILES_DIR, file.filename))
            return jsonify({'status': 'success', 'msg': '文件上传成功'})
    except Exception as e:
        return jsonify({'status': 'error', 'msg': str(e)}), 500

# 删除文件
@app.route('/api/file/<filename>', methods=['DELETE'])
def delete_file(filename):
    # 验证密码
    password = request.args.get('password')
    if not verify_password(password):
        return jsonify({'status': 'error', 'msg': '密码错误'}), 401
    
    try:
        file_path = os.path.join(FILES_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({'status': 'success', 'msg': '文件删除成功'})
        else:
            return jsonify({'status': 'error', 'msg': '文件不存在'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'msg': str(e)}), 500

# 获取文件内容
@app.route('/api/file/<filename>', methods=['GET'])
def get_file_content(filename):
    # 验证密码
    password = request.args.get('password')
    if not verify_password(password):
        return jsonify({'status': 'error', 'msg': '密码错误'}), 401
    
    try:
        file_path = os.path.join(FILES_DIR, filename)
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({'status': 'success', 'content': content, 'filename': filename})
        else:
            return jsonify({'status': 'error', 'msg': '文件不存在'}), 404
    except Exception as e:
        return jsonify({'status': 'error', 'msg': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=8080, debug=True)