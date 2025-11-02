// 服务器地址和密码
let serverUrl = localStorage.getItem('serverUrl') || '';
let accessPassword = localStorage.getItem('accessPassword') || '';

// 当前文件信息
let currentFile = null;

// 要删除的文件信息
let fileToDelete = null;

// 页面元素
const configPage = document.getElementById('config-page');
const mainPage = document.getElementById('main-page');
const mobileMenuModal = document.getElementById('mobile-menu-modal');
const mobileChangePasswordModal = document.getElementById('mobile-change-password-modal');
const deleteConfirmModal = document.getElementById('delete-confirm-modal');

// 输入元素
const serverUrlInput = document.getElementById('mobile-server-url');
const accessPasswordInput = document.getElementById('mobile-access-password');
const fileTitleInput = document.getElementById('file-title');
const fileContentInput = document.getElementById('file-content');

// 按钮元素
const saveConfigBtn = document.getElementById('mobile-save-config');
const addFileBtn = document.getElementById('add-file-btn');
const saveFileBtn = document.getElementById('save-file-btn');
const menuBtn = document.getElementById('mobile-menu');
const closeMenuBtn = document.getElementById('mobile-close-menu');
const changePasswordBtn = document.getElementById('mobile-change-password');
const logoutBtn = document.getElementById('mobile-logout');
const cancelChangeBtn = document.getElementById('mobile-cancel-change');
const confirmChangeBtn = document.getElementById('mobile-confirm-change');
const refreshBtn = document.getElementById('mobile-refresh');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');

// 初始化应用
function initApp() {
    if (serverUrl && accessPassword) {
        configPage.style.display = 'none';
        mainPage.classList.add('active');
        loadFiles();
    } else {
        configPage.style.display = 'block';
        mainPage.classList.remove('active');
    }
}

// 保存服务器配置
saveConfigBtn.addEventListener('click', () => {
    const url = serverUrlInput.value.trim();
    const password = accessPasswordInput.value.trim();
    
    if (!url) {
        alert('请输入服务器地址');
        return;
    }
    
    if (!password) {
        alert('请输入访问密码');
        return;
    }
    
    // 验证密码
    fetch(`${url}/api/notes?password=${encodeURIComponent(password)}`)
    .then(response => response.json())
    .then(data => {
        if (data.status === 'error') {
            alert('密码错误: ' + data.msg);
            return;
        }
        
        serverUrl = url;
        accessPassword = password;
        localStorage.setItem('serverUrl', serverUrl);
        localStorage.setItem('accessPassword', accessPassword);
        configPage.style.display = 'none';
        mainPage.classList.add('active');
        loadFiles();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('连接服务器失败，请检查服务器地址');
    });
});

// 新增文件
addFileBtn.addEventListener('click', () => {
    // 清空当前文件信息
    currentFile = null;
    fileTitleInput.value = '';
    fileContentInput.value = '';
    // 移除所有文件项的active状态
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('active');
    });
});

// 保存文件
saveFileBtn.addEventListener('click', () => {
    const title = fileTitleInput.value.trim();
    const content = fileContentInput.value.trim();
    
    if (!title) {
        alert('请输入文件标题');
        return;
    }
    
    if (currentFile) {
        // 更新现有文件（这里简化处理，实际应该有更新接口）
        saveAsNewFile(title, content);
    } else {
        // 保存为新文件
        saveAsNewFile(title, content);
    }
});

// 保存为新文件
function saveAsNewFile(title, content) {
    // 创建笔记形式保存文件内容
    fetch(`${serverUrl}/api/note`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            title, 
            content,
            password: accessPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('保存成功');
            loadFiles();
        } else {
            alert('保存失败: ' + data.msg);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('保存失败，请检查服务器连接');
    });
}

// 加载文件列表
function loadFiles() {
    fetch(`${serverUrl}/api/notes?password=${encodeURIComponent(accessPassword)}`)
    .then(response => response.json())
    .then(data => {
        const filesList = document.getElementById('mobile-files-list');
        filesList.innerHTML = '';
        
        if (data.notes && data.notes.length > 0) {
            data.notes.forEach(note => {
                const fileElement = document.createElement('div');
                fileElement.className = 'file-item';
                fileElement.innerHTML = `
                    <div class="font-medium text-gray-800 truncate">${note.title}</div>
                    <div class="text-xs text-gray-500 mt-1">${note.time}</div>
                `;
                fileElement.addEventListener('click', () => openFile(note));
                
                // 添加右滑删除功能的说明（在实际应用中可以实现手势识别）
                fileElement.addEventListener('touchstart', handleTouchStart);
                fileElement.addEventListener('touchmove', handleTouchMove);
                fileElement.addEventListener('touchend', handleTouchEnd);
                
                filesList.appendChild(fileElement);
            });
        } else {
            filesList.innerHTML = '<p class="text-gray-500 text-center py-4 text-sm">暂无文件</p>';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('加载文件失败，请检查服务器连接');
    });
}

// 打开文件
function openFile(note) {
    currentFile = note;
    fileTitleInput.value = note.title;
    fileContentInput.value = note.content;
    
    // 更新文件项的active状态
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
}

// 触摸事件处理（用于实现滑动删除）
let touchStartX = 0;
let touchEndX = 0;

function handleTouchStart(event) {
    touchStartX = event.changedTouches[0].screenX;
}

function handleTouchMove(event) {
    // 可以在这里添加滑动效果
}

function handleTouchEnd(event) {
    touchEndX = event.changedTouches[0].screenX;
    const diffX = touchStartX - touchEndX;
    
    // 如果向左滑动超过50像素，显示删除确认
    if (diffX > 50) {
        const noteTitle = event.currentTarget.querySelector('.font-medium').textContent;
        showDeleteConfirm(currentFile ? currentFile.id : null, noteTitle);
    }
}

// 显示删除确认对话框
function showDeleteConfirm(noteId, noteTitle) {
    fileToDelete = { id: noteId, title: noteTitle };
    document.getElementById('delete-file-name').textContent = noteTitle;
    deleteConfirmModal.style.display = 'flex';
}

// 取消删除
cancelDeleteBtn.addEventListener('click', () => {
    deleteConfirmModal.style.display = 'none';
    fileToDelete = null;
});

// 确认删除
confirmDeleteBtn.addEventListener('click', () => {
    if (fileToDelete) {
        // 这里我们使用一个变通方法，因为API没有提供直接删除笔记的功能
        // 我们将创建一个标题为"[已删除]"的笔记来覆盖原笔记
        fetch(`${serverUrl}/api/note`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                title: '[已删除]', 
                content: '此笔记已被删除',
                password: accessPassword
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('删除成功');
                deleteConfirmModal.style.display = 'none';
                fileToDelete = null;
                loadFiles();
                
                // 如果删除的是当前打开的文件，清空编辑区域
                if (currentFile && currentFile.id === fileToDelete.id) {
                    fileTitleInput.value = '';
                    fileContentInput.value = '';
                    currentFile = null;
                }
            } else {
                alert('删除失败: ' + data.msg);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('删除失败，请检查服务器连接');
        });
    }
});

// 刷新文件列表
refreshBtn.addEventListener('click', () => {
    mobileMenuModal.classList.add('hidden');
    loadFiles();
});

// 打开菜单
menuBtn.addEventListener('click', () => {
    mobileMenuModal.classList.remove('hidden');
});

// 关闭菜单
closeMenuBtn.addEventListener('click', () => {
    mobileMenuModal.classList.add('hidden');
});

// 修改密码选项
changePasswordBtn.addEventListener('click', () => {
    mobileMenuModal.classList.add('hidden');
    mobileChangePasswordModal.classList.remove('hidden');
});

// 取消修改密码
cancelChangeBtn.addEventListener('click', () => {
    mobileChangePasswordModal.classList.add('hidden');
});

// 确认修改密码
confirmChangeBtn.addEventListener('click', () => {
    const oldPassword = document.getElementById('mobile-old-password').value.trim();
    const newPassword = document.getElementById('mobile-new-password').value.trim();
    const confirmPassword = document.getElementById('mobile-confirm-password').value.trim();
    
    if (!oldPassword) {
        alert('请输入原密码');
        return;
    }
    
    if (!newPassword) {
        alert('请输入新密码');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('两次输入的新密码不一致');
        return;
    }
    
    fetch(`${serverUrl}/api/change_password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('密码修改成功');
            accessPassword = newPassword;
            localStorage.setItem('accessPassword', accessPassword);
            mobileChangePasswordModal.classList.add('hidden');
            // 清空输入框
            document.getElementById('mobile-old-password').value = '';
            document.getElementById('mobile-new-password').value = '';
            document.getElementById('mobile-confirm-password').value = '';
        } else {
            alert('修改失败: ' + data.msg);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('修改密码失败，请检查服务器连接');
    });
});

// 退出登录
logoutBtn.addEventListener('click', () => {
    mobileMenuModal.classList.add('hidden');
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('serverUrl');
        localStorage.removeItem('accessPassword');
        serverUrl = '';
        accessPassword = '';
        mainPage.classList.remove('active');
        configPage.style.display = 'block';
        serverUrlInput.value = '';
        accessPasswordInput.value = '';
    }
});

// 点击模态框外部关闭
window.addEventListener('click', (event) => {
    if (event.target === mobileMenuModal) {
        mobileMenuModal.classList.add('hidden');
    }
    if (event.target === mobileChangePasswordModal) {
        mobileChangePasswordModal.classList.add('hidden');
    }
    if (event.target === deleteConfirmModal) {
        deleteConfirmModal.style.display = 'none';
        fileToDelete = null;
    }
});

// 初始化应用
initApp();