// デバッグモードフラグ（開発時のみtrueにする）
const DEBUG_MODE = false;

// デバッグログ用のヘルパー関数
function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log(...args);
    }
}

// エラーログは常に出力
function errorLog(...args) {
    console.error(...args);
}

// ButtonManager: ボタン生成・配置・削除・ドラッグ移動・状態保存/復元
class ButtonManager {
    constructor(visualizer, uiManager) {
        this.visualizer = visualizer;
        this.uiManager = uiManager;
        this.buttons = [];
        this.assignments = {};
    }
    createInitialButtons() {
        const visualizer = document.getElementById('visualizer');
        visualizer.innerHTML = '';

        // 方向ボタン（左側）
        const directionButtons = [
            { id: 'up', name: '上', x: 90, y: 200, type: 'direction', class: 'up' },
            { id: 'down', name: '下', x: 100, y: 320, type: 'direction' },
            { id: 'left', name: '左', x: 40, y: 260, type: 'direction' },
            { id: 'right', name: '右', x: 160, y: 260, type: 'direction' }
        ];

        // アクションボタン（右側、4列×3段）
        const actionButtons = [
            { id: 'lp', name: 'LP', x: 400, y: 200, type: 'action' },
            { id: 'mp', name: 'MP', x: 480, y: 200, type: 'action' },
            { id: 'hp', name: 'HP', x: 560, y: 200, type: 'action' },
            { id: 'lk', name: 'LK', x: 640, y: 200, type: 'action' },
            { id: 'mk', name: 'MK', x: 400, y: 280, type: 'action' },
            { id: 'hk', name: 'HK', x: 480, y: 280, type: 'action' },
            { id: 'l', name: 'L', x: 560, y: 280, type: 'action' },
            { id: 'm', name: 'M', x: 640, y: 280, type: 'action' },
            { id: 'h', name: 'H', x: 400, y: 360, type: 'action' },
            { id: 's1', name: 'S1', x: 480, y: 360, type: 'action' },
            { id: 's2', name: 'S2', x: 560, y: 360, type: 'action' },
            { id: 's3', name: 'S3', x: 640, y: 360, type: 'action' }
        ];

        const allButtons = [...directionButtons, ...actionButtons];

        allButtons.forEach(buttonData => {
            const button = this.createButton(buttonData);
            this.buttons.push(button);
            visualizer.appendChild(button.element);
        });
    }

    createButton(data) {
        const buttonElement = document.createElement('div');
        buttonElement.className = `fightstick-button ${data.type}${data.class ? ' ' + data.class : ''}`;
        buttonElement.id = `button-${data.id}`;
        buttonElement.style.left = `${data.x}px`;
        buttonElement.style.top = `${data.y}px`;
        buttonElement.textContent = data.name;

        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.deleteButton(data.id);
        };
        buttonElement.appendChild(deleteBtn);

        // クリックイベントを直接ボタン要素に追加
        buttonElement.addEventListener('click', (e) => {
            debugLog('Direct click on button:', data.id, 'preventClick:', this.visualizer.inputManager.preventClick, 'wasDragging:', this.visualizer.inputManager.wasDragging);
            if (!this.visualizer.inputManager.preventClick && !this.visualizer.inputManager.wasDragging) {
                this.visualizer.inputManager.startGamepadAssignment(data.id);
            } else {
                debugLog('Click prevented due to preventClick flag or wasDragging');
            }
        });

        const button = {
            id: data.id,
            name: data.name,
            type: data.type,
            element: buttonElement,
            x: data.x,
            y: data.y,
            assignments: data.assignments || this.assignments[data.id] || {}
        };

        return button;
    }

    deleteButton(buttonId) {
        const button = this.buttons.find(b => b.id === buttonId);
        if (button) {
            button.element.remove();
            this.buttons = this.buttons.filter(b => b.id !== buttonId);
            delete this.assignments[buttonId];
            this.visualizer.stateManager.saveAssignments();
        }
    }

    saveButtonPosition(buttonElement) {
        const buttonId = buttonElement.id.replace('button-', '');
        const button = this.buttons.find(b => b.id === buttonId);
        if (button) {
            button.x = parseInt(buttonElement.style.left);
            button.y = parseInt(buttonElement.style.top);
            this.visualizer.stateManager.saveAssignments();
        }
    }

    resetLayout() {
        this.createInitialButtons();
        this.visualizer.stateManager.loadAssignments();
    }

    saveCurrentState() {
        const state = {
            buttons: this.buttons,
            assignments: this.assignments
        };
        
        try {
            localStorage.setItem('fightstickState', JSON.stringify(state));
            this.visualizer.uiManager.showNotification('現在の状態をLocalStorageに保存しました', 'success');
        } catch (error) {
            this.visualizer.uiManager.showNotification('保存に失敗しました: ' + error.message, 'error');
        }
    }

    loadSavedState() {
        const savedState = localStorage.getItem('fightstickState');
        if (!savedState) {
            this.visualizer.uiManager.showNotification('保存された状態が見つかりません', 'error');
            return;
        }
        try {
            const state = JSON.parse(savedState);
            if (state.buttons && state.assignments) {
                // 完全初期化
                this.buttons = [];
                const visualizer = document.getElementById('visualizer');
                visualizer.innerHTML = '';
                // 割り当て情報を先に復元
                this.assignments = state.assignments;
                // 保存データからボタンを再生成
                state.buttons.forEach(savedButton => {
                    const button = this.createButton(savedButton);
                    this.buttons.push(button);
                    visualizer.appendChild(button.element);
                });
                this.visualizer.uiManager.showNotification('保存された状態を復元しました', 'success');
            } else {
                this.visualizer.uiManager.showNotification('保存された状態の形式が正しくありません', 'error');
            }
        } catch (error) {
            this.visualizer.uiManager.showNotification('状態の復元に失敗しました: ' + error.message, 'error');
        }
    }

    generateOBSHTML() {
        const obsHTML = this.createOBSHTML();
        const blob = new Blob([obsHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fightstick_obs_overlay.html';
        a.click();
        
        URL.revokeObjectURL(url);
    }

    createOBSHTML() {
        const activeButtons = this.buttons.filter(button => 
            button.element.style.display !== 'none'
        );

        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fightstick OBS Overlay</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: transparent;
            overflow: hidden;
        }
        .fightstick-button {
            position: absolute;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 3px solid rgba(255, 255, 255, 0.3);
            background: linear-gradient(145deg, #2a2a3e, #1a1a2e);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            color: #ffffff;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        /* 方向ボタンもアクションボタンと同じ色に統一 */
        .fightstick-button.direction {
            background: linear-gradient(145deg, #2a2a3e, #1a1a2e);
            border-color: rgba(255, 255, 255, 0.3);
        }
        .fightstick-button.direction.up {
            width: 80px;
            height: 80px;
            font-size: 14px;
        }
        .fightstick-button.active {
            background: linear-gradient(145deg, #ff6b6b, #ee5a24);
            border-color: #ff6b6b;
            transform: scale(1.15);
            box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
        }
        .fightstick-button.direction.active {
            background: linear-gradient(145deg, #ff6b6b, #ee5a24);
            border-color: #ff6b6b;
        }
    </style>
</head>
<body>
    ${activeButtons.map(button => `
    <div id="button-${button.id}" class="fightstick-button ${button.type}${button.element.classList.contains('up') ? ' up' : ''}" 
         style="left: ${button.x}px; top: ${button.y}px;">
    </div>
    `).join('')}
    
    <script>
        // OBS用の入力検出スクリプト
        const buttons = ${JSON.stringify(activeButtons.map(b => ({
            id: b.id,
            assignments: b.assignments
        })))};
        
        document.addEventListener('keydown', (e) => {
            buttons.forEach(button => {
                if (button.assignments.keyboard === e.code) {
                    document.getElementById('button-' + button.id).classList.add('active');
                }
            });
        });
        
        document.addEventListener('keyup', (e) => {
            buttons.forEach(button => {
                if (button.assignments.keyboard === e.code) {
                    document.getElementById('button-' + button.id).classList.remove('active');
                }
            });
        });
        
        // ゲームパッド検出（Xbox 360対応版）
        setInterval(() => {
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            gamepads.forEach((gamepad, index) => {
                if (gamepad && gamepad.connected) {
                    // Xbox 360コントローラーの場合
                    if (gamepad.mapping === 'standard' || gamepad.id.includes('Xbox 360')) {
                        const xboxButtons = [
                            'A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start',
                            'LeftStick', 'RightStick', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight', 'Guide'
                        ];
                        
                        gamepad.buttons.forEach((button, buttonIndex) => {
                            const buttonName = xboxButtons[buttonIndex] || \`Button\${buttonIndex}\`;
                            const input = \`gamepad\${index}-\${buttonName}\`;
                            buttons.forEach(btn => {
                                const element = document.getElementById('button-' + btn.id);
                                if (btn.assignments.gamepad === input) {
                                    if (button.pressed) {
                                        element.classList.add('active');
                                    } else {
                                        element.classList.remove('active');
                                    }
                                }
                            });
                        });
                    } else {
                        // 汎用ボタン入力検出
                        gamepad.buttons.forEach((button, buttonIndex) => {
                            const input = \`gamepad\${index}-button\${buttonIndex}\`;
                            buttons.forEach(btn => {
                                const element = document.getElementById('button-' + btn.id);
                                if (btn.assignments.gamepad === input) {
                                    if (button.pressed) {
                                        element.classList.add('active');
                                    } else {
                                        element.classList.remove('active');
                                    }
                                }
                            });
                        });
                    }
                    
                    // アナログスティック入力検出
                    if (gamepad.axes.length >= 4) {
                        const leftX = gamepad.axes[0];
                        const leftY = gamepad.axes[1];
                        const rightX = gamepad.axes[2];
                        const rightY = gamepad.axes[3];
                        const deadzone = 0.5;
                        
                        // 左スティック
                        if (Math.abs(leftX) > deadzone || Math.abs(leftY) > deadzone) {
                            if (leftY < -deadzone) {
                                const input = \`gamepad\${index}-leftStick-up\`;
                                this.activateButtonByInput(buttons, input);
                            } else if (leftY > deadzone) {
                                const input = \`gamepad\${index}-leftStick-down\`;
                                this.activateButtonByInput(buttons, input);
                            }
                            if (leftX < -deadzone) {
                                const input = \`gamepad\${index}-leftStick-left\`;
                                this.activateButtonByInput(buttons, input);
                            } else if (leftX > deadzone) {
                                const input = \`gamepad\${index}-leftStick-right\`;
                                this.activateButtonByInput(buttons, input);
                            }
                        }
                        
                        // 右スティック
                        if (Math.abs(rightX) > deadzone || Math.abs(rightY) > deadzone) {
                            if (rightY < -deadzone) {
                                const input = \`gamepad\${index}-rightStick-up\`;
                                this.activateButtonByInput(buttons, input);
                            } else if (rightY > deadzone) {
                                const input = \`gamepad\${index}-rightStick-down\`;
                                this.activateButtonByInput(buttons, input);
                            }
                            if (rightX < -deadzone) {
                                const input = \`gamepad\${index}-rightStick-left\`;
                                this.activateButtonByInput(buttons, input);
                            } else if (rightX > deadzone) {
                                const input = \`gamepad\${index}-rightStick-right\`;
                                this.activateButtonByInput(buttons, input);
                            }
                        }
                    }
                }
            });
        }, 16);
        
        function activateButtonByInput(buttons, input) {
            buttons.forEach(btn => {
                const element = document.getElementById('button-' + btn.id);
                if (btn.assignments.gamepad === input) {
                    element.classList.add('active');
                    setTimeout(() => element.classList.remove('active'), 100);
                }
            });
        }
    </script>
</body>
</html>`;
    }

    saveAssignments() {
        localStorage.setItem('fightstickAssignments', JSON.stringify(this.assignments));
        localStorage.setItem('fightstickButtonPositions', JSON.stringify(
            this.buttons.map(b => ({ id: b.id, x: b.x, y: b.y, name: b.name }))
        ));
    }

    loadAssignments() {
        // 新しい保存形式（saveCurrentState）を優先的に読み込み
        const savedState = localStorage.getItem('fightstickState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.buttons && state.assignments) {
                    this.assignments = state.assignments;
                    
                    // ボタンの位置と名前を復元
                    state.buttons.forEach(savedButton => {
                        const button = this.buttons.find(b => b.id === savedButton.id);
                        if (button) {
                            button.x = savedButton.x;
                            button.y = savedButton.y;
                            button.name = savedButton.name;
                            button.assignments = savedButton.assignments || {};
                            button.element.style.left = `${savedButton.x}px`;
                            button.element.style.top = `${savedButton.y}px`;
                            button.element.textContent = savedButton.name;
                        }
                    });
                    
                    debugLog('保存された状態を復元しました');
                    return;
                }
            } catch (error) {
                errorLog('保存された状態の読み込みに失敗:', error);
            }
        }
        
        // 従来の保存形式（フォールバック）
        const savedAssignments = localStorage.getItem('fightstickAssignments');
        const savedPositions = localStorage.getItem('fightstickButtonPositions');
        
        if (savedAssignments) {
            this.assignments = JSON.parse(savedAssignments);
        }
        
        if (savedPositions) {
            const positions = JSON.parse(savedPositions);
            positions.forEach(pos => {
                const button = this.buttons.find(b => b.id === pos.id);
                if (button) {
                    button.x = pos.x;
                    button.y = pos.y;
                    button.name = pos.name;
                    button.element.style.left = `${pos.x}px`;
                    button.element.style.top = `${pos.y}px`;
                    button.element.textContent = pos.name;
                }
            });
        }
    }
}

// InputManager: キーボード・ゲームパッド入力の検出、割り当て、アクティブ化/非アクティブ化
class InputManager {
    constructor(visualizer, buttonManager, uiManager) {
        this.visualizer = visualizer;
        this.buttonManager = buttonManager;
        this.uiManager = uiManager;
        this.isDragging = false;
        this.wasDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.preventClick = false;
        this.gamepadMapping = {};
    }
    setupEventListeners() {
        // キーボードイベント
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // ボタンクリックイベント（フォールバック用）
        document.addEventListener('click', (e) => {
            debugLog('Document click event:', e.target, e.target.classList);
            
            if (e.target.classList.contains('fightstick-button')) {
                debugLog('Fightstick button clicked (document):', e.target.id, 'preventClick:', this.preventClick, 'wasDragging:', this.wasDragging);
                if (!this.preventClick && !this.wasDragging) {
                    // 直接コントローラー入力待機状態に移行
                    const buttonId = e.target.id.replace('button-', '');
                    debugLog('Starting gamepad assignment for:', buttonId);
                    this.startGamepadAssignment(buttonId);
                } else {
                    debugLog('Click prevented due to preventClick flag or wasDragging (document)');
                }
                this.preventClick = false;
            }
        });
        


        // ドラッグ＆ドロップ
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());

        // コントロールボタン
        document.getElementById('resetLayout').addEventListener('click', () => this.buttonManager.resetLayout());
        document.getElementById('saveCurrentState').addEventListener('click', () => this.buttonManager.saveCurrentState());
        document.getElementById('loadSavedState').addEventListener('click', () => this.buttonManager.loadSavedState());
        document.getElementById('generateOBS').addEventListener('click', () => this.buttonManager.generateOBSHTML());
        document.getElementById('toggleDebug').addEventListener('click', () => this.uiManager.toggleDebugInfo());
        document.getElementById('testGamepad').addEventListener('click', () => this.gamepadManager.testGamepad());
        document.getElementById('refreshGamepads').addEventListener('click', () => this.gamepadManager.refreshGamepads());


    }

    handleKeyDown(e) {
        e.preventDefault();
        this.uiManager.updateKeyboardStatus(e.code);
        this.activateButtonsByInput('keyboard', e.code);
    }

    handleKeyUp(e) {
        this.uiManager.updateKeyboardStatus('待機中');
        this.deactivateButtonsByInput('keyboard', e.code);
    }

    handleMouseDown(e) {
        if (e.target.classList.contains('fightstick-button')) {
            debugLog('Mouse down on fightstick button:', e.target.id);
            
            // 削除ボタンがクリックされた場合はドラッグしない
            if (e.target.classList.contains('delete-btn')) {
                return;
            }
            
            // ドラッグ開始位置を記録
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.dragStartTime = Date.now();
            
            // 現在ドラッグ対象のボタンを記録
            this.currentDragButton = e.target;
            
            this.isDragging = false; // 最初はfalse
            this.preventClick = false; // 最初はfalse
            
            const button = e.target;
            const rect = button.getBoundingClientRect();
            const visualizerRect = document.getElementById('visualizer').getBoundingClientRect();
            
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
        }
    }

    handleMouseMove(e) {
        // ドラッグ判定（移動距離が5px以上、または時間が100ms以上）
        if (this.dragStartX !== undefined && this.dragStartY !== undefined && this.currentDragButton) {
            const moveDistance = Math.sqrt(
                Math.pow(e.clientX - this.dragStartX, 2) + 
                Math.pow(e.clientY - this.dragStartY, 2)
            );
            const moveTime = Date.now() - this.dragStartTime;
            
            if (moveDistance > 5 || moveTime > 100) {
                if (!this.isDragging) {
                    debugLog('Starting drag, distance:', moveDistance, 'time:', moveTime, 'button:', this.currentDragButton.id);
                    this.isDragging = true;
                    this.wasDragging = true;
                    this.preventClick = true;
                    
                    // 記録されたボタンにdraggingクラスを追加
                    this.currentDragButton.classList.add('dragging');
                }
            }
        }
        
        if (this.isDragging && this.currentDragButton) {
            const visualizer = document.getElementById('visualizer');
            const visualizerRect = visualizer.getBoundingClientRect();
            
            const newX = e.clientX - visualizerRect.left - this.dragOffset.x;
            const newY = e.clientY - visualizerRect.top - this.dragOffset.y;
            
            // 境界内に制限
            const maxX = visualizerRect.width - 60;
            const maxY = visualizerRect.height - 60;
            
            this.currentDragButton.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            this.currentDragButton.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
        }
    }

    handleMouseUp() {
        debugLog('Mouse up event, isDragging:', this.isDragging, 'wasDragging:', this.wasDragging, 'currentDragButton:', this.currentDragButton?.id);
        
        if (this.isDragging && this.currentDragButton) {
            this.currentDragButton.classList.remove('dragging');
            this.buttonManager.saveButtonPosition(this.currentDragButton);
            this.isDragging = false;
        }
        
        // ドラッグ開始情報をリセット
        this.dragStartX = undefined;
        this.dragStartY = undefined;
        this.dragStartTime = undefined;
        this.currentDragButton = null;
        
        // 必ずpreventClickをfalseにリセット
        this.preventClick = false;
        
        // wasDraggingフラグを少し遅延してリセット（クリックイベントが発火する前に）
        setTimeout(() => {
            this.wasDragging = false;
            debugLog('wasDragging reset to false');
        }, 10);
        
        debugLog('preventClick reset to false');
    }

    activateButtonsByInput(type, input) {
        if (!this.buttonManager || !this.buttonManager.buttons) return;
        debugLog(`Activating buttons for ${type} input: ${input}`);
        let activated = false;
        
        this.buttonManager.buttons.forEach(button => {
            if (button.assignments[type] === input) {
                debugLog(`Activating button: ${button.id}`);
                button.element.classList.add('active');
                button.element.classList.add('pulse');
                setTimeout(() => button.element.classList.remove('pulse'), 300);
                activated = true;
            }
        });
        
        if (!activated) {
            debugLog(`No buttons assigned to ${type} input: ${input}`);
        }
    }

    deactivateButtonsByInput(type, input) {
        if (!this.buttonManager || !this.buttonManager.buttons) return;
        this.buttonManager.buttons.forEach(button => {
            if (button.assignments[type] === input) {
                button.element.classList.remove('active');
            }
        });
    }

    startGamepadAssignment(buttonId) {
        if (!this.buttonManager || !this.buttonManager.buttons) return;
        debugLog('startGamepadAssignment called with:', buttonId);
        
        const button = this.buttonManager.buttons.find(b => b.id === buttonId);
        
        if (!button) {
            errorLog('Button not found:', buttonId);
            return;
        }
        
        debugLog('Found button:', button);
        
        // ボタンをハイライト表示
        button.element.classList.add('waiting-for-input');
        
        // ステータス表示を更新
        this.uiManager.updateKeyboardStatus('コントローラー入力待機中...');
        
        // コントローラー入力待機状態を開始
        this.waitingForGamepadInput = true;
        this.waitingButtonId = buttonId;
        
        // 3秒後にタイムアウト
        this.gamepadTimeout = setTimeout(() => {
            this.cancelGamepadAssignment();
        }, 3000);
        
        // ユーザーに通知
        this.uiManager.showNotification(`ボタン「${button.name}」にコントローラーボタンを割り当て中...`);
        
        debugLog('Gamepad assignment started for button:', buttonId);
    }
    
    cancelGamepadAssignment() {
        if (!this.buttonManager || !this.buttonManager.buttons) return;
        if (this.waitingButtonId) {
            const button = this.buttonManager.buttons.find(b => b.id === this.waitingButtonId);
            if (button) {
                button.element.classList.remove('waiting-for-input');
            }
        }
        
        this.waitingForGamepadInput = false;
        this.waitingButtonId = null;
        this.uiManager.updateKeyboardStatus('待機中');
        
        if (this.gamepadTimeout) {
            clearTimeout(this.gamepadTimeout);
            this.gamepadTimeout = null;
        }
        
        this.uiManager.hideNotification();
    }
    
    showNotification(message, type = 'info') {
        // 通知要素を作成
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = `notification notification-${type}`;
        notification.style.display = 'block';
    }
    
    hideNotification() {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.style.display = 'none';
        }
    }
}

// GamepadManager: Gamepad APIの監視・ポーリング・接続/切断イベント・デバッグ情報
class GamepadManager {
    constructor(visualizer, inputManager, uiManager, buttonManager) {
        this.visualizer = visualizer;
        this.inputManager = inputManager;
        this.uiManager = uiManager;
        this.buttonManager = buttonManager;
        this.gamepads = [];
        this.gamepadInfo = [];
    }
    setupGamepadEvents() {
        // ゲームパッド接続イベント
        window.addEventListener('gamepadconnected', (e) => {
            this.onGamepadConnected(e);
        });

        // ゲームパッド切断イベント
        window.addEventListener('gamepaddisconnected', (e) => {
            this.onGamepadDisconnected(e);
        });
    }

    onGamepadConnected(e) {
        const gamepad = e.gamepad;
        debugLog('Gamepad connected:', gamepad.id, gamepad.mapping);
        
        this.gamepadInfo[gamepad.index] = {
            id: gamepad.id,
            mapping: gamepad.mapping,
            buttons: gamepad.buttons.length,
            axes: gamepad.axes.length,
            timestamp: Date.now()
        };
        
        this.uiManager.updateGamepadStatus(this.gamepads, this.gamepadInfo);
        this.uiManager.showNotification(`コントローラー接続: ${gamepad.id}`);
        setTimeout(() => this.uiManager.hideNotification(), 2000);
    }

    onGamepadDisconnected(e) {
        const gamepadIndex = e.gamepad.index;
        debugLog('Gamepad disconnected:', gamepadIndex);
        
        delete this.gamepadInfo[gamepadIndex];
        this.uiManager.updateGamepadStatus(this.gamepads, this.gamepadInfo);
        this.uiManager.showNotification('コントローラーが切断されました');
        setTimeout(() => this.uiManager.hideNotification(), 2000);
    }

    startGamepadPolling() {
        // 初期化時に既存のゲームパッドを取得
        this.gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        
        // フォーカス状態を追跡
        this.isPageVisible = true;
        this.pollingInterval = null;
        this.animationFrameId = null;
        
        // ページの可視性変更を監視
        document.addEventListener('visibilitychange', () => {
            this.isPageVisible = !document.hidden;
            if (this.isPageVisible) {
                // ページが表示されたら、requestAnimationFrameベースのポーリングに切り替え
                this.switchToAnimationFramePolling();
            } else {
                // ページが非表示になったら、setIntervalベースのポーリングに切り替え
                this.switchToIntervalPolling();
            }
        });
        
        // ウィンドウフォーカス変更を監視
        window.addEventListener('focus', () => {
            this.isPageVisible = true;
            this.switchToAnimationFramePolling();
        });
        
        window.addEventListener('blur', () => {
            this.isPageVisible = false;
            this.switchToIntervalPolling();
        });
        
        // 初期状態でポーリング開始
        this.switchToAnimationFramePolling();
    }
    
    switchToAnimationFramePolling() {
        // 既存のポーリングを停止
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        // requestAnimationFrameベースのポーリング開始
        const pollGamepads = () => {
            this.gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            this.uiManager.updateGamepadStatus(this.gamepads, this.gamepadInfo);
            this.checkGamepadInputs();
            this.animationFrameId = requestAnimationFrame(pollGamepads);
        };
        pollGamepads();
    }
    
    switchToIntervalPolling() {
        // 既存のポーリングを停止
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // setIntervalベースのポーリング開始（60FPS相当）
        this.pollingInterval = setInterval(() => {
            this.gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            this.uiManager.updateGamepadStatus(this.gamepads, this.gamepadInfo);
            this.checkGamepadInputs();
        }, 16); // 約60FPS
    }

    checkGamepadInputs() {
        this.gamepads.forEach((gamepad, index) => {
            if (gamepad && gamepad.connected) {
                // Xbox 360コントローラーの場合、標準マッピングを使用
                if (gamepad.mapping === 'standard' || gamepad.id.includes('Xbox 360')) {
                    this.checkXbox360Inputs(gamepad, index);
                } else {
                    // 汎用ボタン入力の検出
                    gamepad.buttons.forEach((button, buttonIndex) => {
                        if (button.pressed) {
                            const input = `gamepad${index}-button${buttonIndex}`;
                            debugLog(`Button pressed: ${input}, value: ${button.value}`);
                            this.inputManager.activateButtonsByInput('gamepad', input);
                            
                            // コントローラー入力待機中の場合は即座に割り当て
                            if (this.inputManager.waitingForGamepadInput && this.inputManager.waitingButtonId) {
                                debugLog(`Assigning ${input} to button ${this.inputManager.waitingButtonId}`);
                                this.assignGamepadButton(this.inputManager.waitingButtonId, input);
                                this.inputManager.cancelGamepadAssignment();
                            }
                        } else {
                            const input = `gamepad${index}-button${buttonIndex}`;
                            this.inputManager.deactivateButtonsByInput('gamepad', input);
                        }
                    });
                }

                // アナログスティック入力の検出（デジタル化）
                if (gamepad.axes.length >= 4) {
                    this.checkAnalogInputs(gamepad, index);
                }
            }
        });
    }

    checkXbox360Inputs(gamepad, index) {
        // Xbox 360コントローラーの標準ボタンマッピング
        const xboxButtons = [
            'A', 'B', 'X', 'Y',           // 0-3: アクションボタン
            'LB', 'RB',                   // 4-5: ショルダーボタン
            'LT', 'RT',                   // 6-7: トリガー（アナログ）
            'Back', 'Start',              // 8-9: システムボタン
            'LeftStick', 'RightStick',    // 10-11: スティック押し込み
            'DpadUp', 'DpadDown',         // 12-13: D-pad
            'DpadLeft', 'DpadRight',      // 14-15: D-pad
            'Guide'                       // 16: Xboxボタン
        ];

        gamepad.buttons.forEach((button, buttonIndex) => {
            if (button.pressed) {
                const buttonName = xboxButtons[buttonIndex] || `Button${buttonIndex}`;
                const input = `gamepad${index}-${buttonName}`;
                debugLog(`Xbox 360 Button pressed: ${buttonName} (${input}), value: ${button.value}`);
                this.inputManager.activateButtonsByInput('gamepad', input);
                
                // コントローラー入力待機中の場合は即座に割り当て
                if (this.inputManager.waitingForGamepadInput && this.inputManager.waitingButtonId) {
                    debugLog(`Assigning ${input} to button ${this.inputManager.waitingButtonId}`);
                    this.assignGamepadButton(this.inputManager.waitingButtonId, input);
                    this.inputManager.cancelGamepadAssignment();
                }
            } else {
                const buttonName = xboxButtons[buttonIndex] || `Button${buttonIndex}`;
                const input = `gamepad${index}-${buttonName}`;
                this.inputManager.deactivateButtonsByInput('gamepad', input);
            }
        });
    }

    checkAnalogInputs(gamepad, index) {
        // 左スティック
        const leftX = gamepad.axes[0];
        const leftY = gamepad.axes[1];
        
        // 右スティック
        const rightX = gamepad.axes[2];
        const rightY = gamepad.axes[3];

        // デッドゾーン設定（0.5）
        const deadzone = 0.5;

        // 左スティックの方向検出
        if (Math.abs(leftX) > deadzone || Math.abs(leftY) > deadzone) {
            if (leftY < -deadzone) {
                this.handleAnalogInput(index, 'leftStick', 'up');
            } else if (leftY > deadzone) {
                this.handleAnalogInput(index, 'leftStick', 'down');
            }
            if (leftX < -deadzone) {
                this.handleAnalogInput(index, 'leftStick', 'left');
            } else if (leftX > deadzone) {
                this.handleAnalogInput(index, 'leftStick', 'right');
            }
        }

        // 右スティックの方向検出
        if (Math.abs(rightX) > deadzone || Math.abs(rightY) > deadzone) {
            if (rightY < -deadzone) {
                this.handleAnalogInput(index, 'rightStick', 'up');
            } else if (rightY > deadzone) {
                this.handleAnalogInput(index, 'rightStick', 'down');
            }
            if (rightX < -deadzone) {
                this.handleAnalogInput(index, 'rightStick', 'left');
            } else if (rightX > deadzone) {
                this.handleAnalogInput(index, 'rightStick', 'right');
            }
        }
    }

    handleAnalogInput(gamepadIndex, stick, direction) {
        const input = `gamepad${gamepadIndex}-${stick}-${direction}`;
        this.inputManager.activateButtonsByInput('gamepad', input);
        
        // コントローラー入力待機中の場合は即座に割り当て
        if (this.inputManager.waitingForGamepadInput && this.inputManager.waitingButtonId) {
            this.assignGamepadButton(this.inputManager.waitingButtonId, input);
            this.inputManager.cancelGamepadAssignment();
        }
    }
    
    assignGamepadButton(buttonId, gamepadInput) {
        const button = this.buttonManager.buttons.find(b => b.id === buttonId);
        if (button) {
            if (!button.assignments) button.assignments = {};
            button.assignments.gamepad = gamepadInput;
            this.buttonManager.assignments[buttonId] = button.assignments;
            this.buttonManager.saveAssignments();
            
            // 成功通知
            this.uiManager.showNotification(`ボタン「${button.name}」にコントローラーボタンが割り当てられました！`);
            setTimeout(() => this.uiManager.hideNotification(), 2000);
        }
    }

    refreshGamepads() {
        debugLog('Refreshing gamepads...');
        this.gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        this.uiManager.updateGamepadStatus(this.gamepads, this.gamepadInfo);
        this.uiManager.showNotification('コントローラーを再検出しました');
        setTimeout(() => this.uiManager.hideNotification(), 2000);
    }

    testGamepad() {
        debugLog('=== Gamepad Test ===');
        debugLog('Gamepads array:', this.gamepads);
        
        this.gamepads.forEach((gamepad, index) => {
            if (gamepad) {
                debugLog(`Gamepad ${index}:`, {
                    id: gamepad.id,
                    connected: gamepad.connected,
                    buttons: gamepad.buttons.length,
                    axes: gamepad.axes.length,
                    mapping: gamepad.mapping
                });
                
                // ボタンの状態をテスト
                gamepad.buttons.forEach((button, buttonIndex) => {
                    if (button.pressed) {
                        debugLog(`Button ${buttonIndex} is pressed (value: ${button.value})`);
                    }
                });
            }
        });
        
        this.uiManager.showNotification('コンソールでテスト結果を確認してください');
        setTimeout(() => this.uiManager.hideNotification(), 3000);
    }
}

// StateManager: localStorageへの保存・復元、OBS用HTML生成
class StateManager {
    constructor(visualizer, buttonManager, uiManager) {
        this.visualizer = visualizer;
        this.buttonManager = buttonManager;
        this.uiManager = uiManager;
    }
    saveCurrentState() {
        const state = {
            buttons: this.buttonManager.buttons,
            assignments: this.buttonManager.assignments
        };
        
        try {
            localStorage.setItem('fightstickState', JSON.stringify(state));
            this.uiManager.showNotification('現在の状態をLocalStorageに保存しました', 'success');
        } catch (error) {
            this.uiManager.showNotification('保存に失敗しました: ' + error.message, 'error');
        }
    }

    loadSavedState() {
        const savedState = localStorage.getItem('fightstickState');
        if (!savedState) {
            this.uiManager.showNotification('保存された状態が見つかりません', 'error');
            return;
        }
        
        try {
            const state = JSON.parse(savedState);
            if (state.buttons && state.assignments) {
                this.buttonManager.assignments = state.assignments;
                
                // ボタンの位置と名前を復元
                state.buttons.forEach(savedButton => {
                    const button = this.buttonManager.buttons.find(b => b.id === savedButton.id);
                    if (button) {
                        button.x = savedButton.x;
                        button.y = savedButton.y;
                        button.name = savedButton.name;
                        button.assignments = savedButton.assignments || {};
                        button.element.style.left = `${savedButton.x}px`;
                        button.element.style.top = `${savedButton.y}px`;
                        button.element.textContent = savedButton.name;
                    }
                });
                
                debugLog('保存された状態を復元しました');
                return;
            }
        } catch (error) {
            errorLog('状態の復元に失敗しました: ' + error.message, 'error');
        }
    }

    saveAssignments() {
        localStorage.setItem('fightstickAssignments', JSON.stringify(this.buttonManager.assignments));
        localStorage.setItem('fightstickButtonPositions', JSON.stringify(
            this.buttonManager.buttons.map(b => ({ id: b.id, x: b.x, y: b.y, name: b.name }))
        ));
    }

    loadAssignments() {
        // 新しい保存形式（saveCurrentState）を優先的に読み込み
        const savedState = localStorage.getItem('fightstickState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.buttons && state.assignments) {
                    this.buttonManager.assignments = state.assignments;
                    
                    // ボタンの位置と名前を復元
                    state.buttons.forEach(savedButton => {
                        const button = this.buttonManager.buttons.find(b => b.id === savedButton.id);
                        if (button) {
                            button.x = savedButton.x;
                            button.y = savedButton.y;
                            button.name = savedButton.name;
                            button.assignments = savedButton.assignments || {};
                            button.element.style.left = `${savedButton.x}px`;
                            button.element.style.top = `${savedButton.y}px`;
                            button.element.textContent = savedButton.name;
                        }
                    });
                    
                    debugLog('保存された状態を復元しました');
                    return;
                }
            } catch (error) {
                errorLog('保存された状態の読み込みに失敗:', error);
            }
        }
        
        // 従来の保存形式（フォールバック）
        const savedAssignments = localStorage.getItem('fightstickAssignments');
        const savedPositions = localStorage.getItem('fightstickButtonPositions');
        
        if (savedAssignments) {
            this.buttonManager.assignments = JSON.parse(savedAssignments);
        }
        
        if (savedPositions) {
            const positions = JSON.parse(savedPositions);
            positions.forEach(pos => {
                const button = this.buttonManager.buttons.find(b => b.id === pos.id);
                if (button) {
                    button.x = pos.x;
                    button.y = pos.y;
                    button.name = pos.name;
                    button.element.style.left = `${pos.x}px`;
                    button.element.style.top = `${pos.y}px`;
                    button.element.textContent = pos.name;
                }
            });
        }
    }

    generateOBSHTML() {
        const obsHTML = this.buttonManager.createOBSHTML();
        const blob = new Blob([obsHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fightstick_obs_overlay.html';
        a.click();
        
        URL.revokeObjectURL(url);
    }

    createOBSHTML() {
        const activeButtons = this.buttonManager.buttons.filter(button => 
            button.element.style.display !== 'none'
        );

        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fightstick OBS Overlay</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: transparent;
            overflow: hidden;
        }
        .fightstick-button {
            position: absolute;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: 3px solid rgba(255, 255, 255, 0.3);
            background: linear-gradient(145deg, #2a2a3e, #1a1a2e);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            color: #ffffff;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        /* 方向ボタンもアクションボタンと同じ色に統一 */
        .fightstick-button.direction {
            background: linear-gradient(145deg, #2a2a3e, #1a1a2e);
            border-color: rgba(255, 255, 255, 0.3);
        }
        .fightstick-button.direction.up {
            width: 80px;
            height: 80px;
            font-size: 14px;
        }
        .fightstick-button.active {
            background: linear-gradient(145deg, #ff6b6b, #ee5a24);
            border-color: #ff6b6b;
            transform: scale(1.15);
            box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
        }
        .fightstick-button.direction.active {
            background: linear-gradient(145deg, #ff6b6b, #ee5a24);
            border-color: #ff6b6b;
        }
    </style>
</head>
<body>
    ${activeButtons.map(button => `
    <div id="button-${button.id}" class="fightstick-button ${button.type}${button.element.classList.contains('up') ? ' up' : ''}" 
         style="left: ${button.x}px; top: ${button.y}px;">
    </div>
    `).join('')}
    
    <script>
        // OBS用の入力検出スクリプト
        const buttons = ${JSON.stringify(activeButtons.map(b => ({
            id: b.id,
            assignments: b.assignments
        })))};
        
        document.addEventListener('keydown', (e) => {
            buttons.forEach(button => {
                if (button.assignments.keyboard === e.code) {
                    document.getElementById('button-' + button.id).classList.add('active');
                }
            });
        });
        
        document.addEventListener('keyup', (e) => {
            buttons.forEach(button => {
                if (button.assignments.keyboard === e.code) {
                    document.getElementById('button-' + button.id).classList.remove('active');
                }
            });
        });
        
        // ゲームパッド検出（Xbox 360対応版）
        setInterval(() => {
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            gamepads.forEach((gamepad, index) => {
                if (gamepad && gamepad.connected) {
                    // Xbox 360コントローラーの場合
                    if (gamepad.mapping === 'standard' || gamepad.id.includes('Xbox 360')) {
                        const xboxButtons = [
                            'A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start',
                            'LeftStick', 'RightStick', 'DpadUp', 'DpadDown', 'DpadLeft', 'DpadRight', 'Guide'
                        ];
                        
                        gamepad.buttons.forEach((button, buttonIndex) => {
                            const buttonName = xboxButtons[buttonIndex] || \`Button\${buttonIndex}\`;
                            const input = \`gamepad\${index}-\${buttonName}\`;
                            buttons.forEach(btn => {
                                const element = document.getElementById('button-' + btn.id);
                                if (btn.assignments.gamepad === input) {
                                    if (button.pressed) {
                                        element.classList.add('active');
                                    } else {
                                        element.classList.remove('active');
                                    }
                                }
                            });
                        });
                    } else {
                        // 汎用ボタン入力検出
                        gamepad.buttons.forEach((button, buttonIndex) => {
                            const input = \`gamepad\${index}-button\${buttonIndex}\`;
                            buttons.forEach(btn => {
                                const element = document.getElementById('button-' + btn.id);
                                if (btn.assignments.gamepad === input) {
                                    if (button.pressed) {
                                        element.classList.add('active');
                                    } else {
                                        element.classList.remove('active');
                                    }
                                }
                            });
                        });
                    }
                    
                    // アナログスティック入力検出
                    if (gamepad.axes.length >= 4) {
                        const leftX = gamepad.axes[0];
                        const leftY = gamepad.axes[1];
                        const rightX = gamepad.axes[2];
                        const rightY = gamepad.axes[3];
                        const deadzone = 0.5;
                        
                        // 左スティック
                        if (Math.abs(leftX) > deadzone || Math.abs(leftY) > deadzone) {
                            if (leftY < -deadzone) {
                                const input = \`gamepad\${index}-leftStick-up\`;
                                this.activateButtonByInput(buttons, input);
                            } else if (leftY > deadzone) {
                                const input = \`gamepad\${index}-leftStick-down\`;
                                this.activateButtonByInput(buttons, input);
                            }
                            if (leftX < -deadzone) {
                                const input = \`gamepad\${index}-leftStick-left\`;
                                this.activateButtonByInput(buttons, input);
                            } else if (leftX > deadzone) {
                                const input = \`gamepad\${index}-leftStick-right\`;
                                this.activateButtonByInput(buttons, input);
                            }
                        }
                        
                        // 右スティック
                        if (Math.abs(rightX) > deadzone || Math.abs(rightY) > deadzone) {
                            if (rightY < -deadzone) {
                                const input = \`gamepad\${index}-rightStick-up\`;
                                this.activateButtonByInput(buttons, input);
                            } else if (rightY > deadzone) {
                                const input = \`gamepad\${index}-rightStick-down\`;
                                this.activateButtonByInput(buttons, input);
                            }
                            if (rightX < -deadzone) {
                                const input = \`gamepad\${index}-rightStick-left\`;
                                this.activateButtonByInput(buttons, input);
                            } else if (rightX > deadzone) {
                                const input = \`gamepad\${index}-rightStick-right\`;
                                this.activateButtonByInput(buttons, input);
                            }
                        }
                    }
                }
            });
        }, 16);
        
        function activateButtonByInput(buttons, input) {
            buttons.forEach(btn => {
                const element = document.getElementById('button-' + btn.id);
                if (btn.assignments.gamepad === input) {
                    element.classList.add('active');
                    setTimeout(() => element.classList.remove('active'), 100);
                }
            });
        }
    </script>
</body>
</html>`;
    }
}

// UIManager: 通知表示、デバッグパネル、ステータス表示などUI補助
class UIManager {
    constructor() {
        this.notificationElement = document.getElementById('notification');
        if (!this.notificationElement) {
            this.notificationElement = document.createElement('div');
            this.notificationElement.id = 'notification';
            this.notificationElement.className = 'notification';
            document.body.appendChild(this.notificationElement);
        }
        this.debugInfoElement = document.getElementById('debugInfo');
        if (!this.debugInfoElement) {
            this.debugInfoElement = document.createElement('div');
            this.debugInfoElement.id = 'debugInfo';
            this.debugInfoElement.style.display = 'none'; // 初期は非表示
            document.body.appendChild(this.debugInfoElement);
        }
        this.keyboardStatusElement = document.getElementById('keyboardStatus');
        if (!this.keyboardStatusElement) {
            this.keyboardStatusElement = document.createElement('div');
            this.keyboardStatusElement.id = 'keyboardStatus';
            document.body.appendChild(this.keyboardStatusElement);
        }
        this.gamepadStatusElement = document.getElementById('gamepadStatus');
        if (!this.gamepadStatusElement) {
            this.gamepadStatusElement = document.createElement('div');
            this.gamepadStatusElement.id = 'gamepadStatus';
            document.body.appendChild(this.gamepadStatusElement);
        }
    }
    showNotification(message, type = 'info') {
        this.notificationElement.textContent = message;
        this.notificationElement.className = `notification notification-${type}`;
        this.notificationElement.style.display = 'block';
    }
    
    hideNotification() {
        this.notificationElement.style.display = 'none';
    }
    
    updateKeyboardStatus(status) {
        this.keyboardStatusElement.textContent = status;
    }

    updateGamepadStatus(gamepads, gamepadInfo) {
        const connectedGamepads = gamepads.filter(gp => gp);
        let status = '未接続';
        
        if (connectedGamepads.length > 0) {
            const gamepadDetails = connectedGamepads.map((gp, index) => {
                const info = gamepadInfo[gp.index];
                if (info) {
                    return `${info.id} (${info.mapping || 'unknown'})`;
                }
                return `Gamepad ${index}`;
            });
            status = `${connectedGamepads.length}台接続中: ${gamepadDetails.join(', ')}`;
        }
        
        this.gamepadStatusElement.textContent = status;
    }

    updateStatus() {
        setInterval(() => {
            this.updateGamepadStatus(this.gamepadManager.gamepads, this.gamepadManager.gamepadInfo);
            this.updateDebugInfo();
        }, 1000);
    }

    toggleDebugInfo() {
        if (this.debugInfoElement.style.display === 'none') {
            this.debugInfoElement.style.display = 'block';
            document.getElementById('toggleDebug').textContent = 'デバッグ情報非表示';
        } else {
            this.debugInfoElement.style.display = 'none';
            document.getElementById('toggleDebug').textContent = 'デバッグ情報表示';
        }
    }

    updateDebugInfo() {
        if (!this.buttonManager || !this.gamepadManager) return;
        let debugHTML = '';
        
        // フォーカス状態の情報を追加
        debugHTML += `
            <div class="focus-debug-info">
                <h4>フォーカス状態</h4>
                <p><strong>ページ可視性:</strong> ${document.hidden ? '非表示' : '表示'}</p>
                <p><strong>可視性状態:</strong> ${document.visibilityState}</p>
                <p><strong>フォーカス状態:</strong> ${document.hasFocus() ? 'フォーカス中' : 'フォーカスなし'}</p>
                <p><strong>ポーリング方式:</strong> ${this.gamepadManager.isPageVisible ? 'requestAnimationFrame' : 'setInterval'}</p>
                <p><strong>Wake Lock:</strong> ${this.gamepadManager.wakeLock ? '有効' : '無効'}</p>
            </div>
        `;
        
        this.gamepadManager.gamepads.forEach((gamepad, index) => {
            if (gamepad) {
                const info = this.gamepadManager.gamepadInfo[gamepad.index];
                const isXbox360 = gamepad.mapping === 'standard' || gamepad.id.includes('Xbox 360');
                const buttonLabels = this.getButtonLabels(gamepad);
                
                debugHTML += `
                    <div class="gamepad-debug-item">
                        <h4>Gamepad ${index} ${isXbox360 ? '(Xbox 360)' : ''}</h4>
                        <p><strong>ID:</strong> ${gamepad.id}</p>
                        <p><strong>Mapping:</strong> ${gamepad.mapping || 'unknown'}</p>
                        <p><strong>Buttons:</strong> ${gamepad.buttons.length}</p>
                        <p><strong>Axes:</strong> ${gamepad.axes.length}</p>
                        <p><strong>Connected:</strong> ${gamepad.connected ? 'Yes' : 'No'}</p>
                        <p><strong>Timestamp:</strong> ${gamepad.timestamp || 'N/A'}</p>
                        <div class="button-states">
                            <h5>ボタン状態 (pressed/value):</h5>
                            ${gamepad.buttons.map((btn, i) => {
                                const label = buttonLabels[i] || `Button${i}`;
                                return `<span class="button-state ${btn.pressed ? 'pressed' : ''}">${label}: ${btn.pressed ? 'ON' : 'OFF'} (${btn.value.toFixed(3)})</span>`;
                            }).join('')}
                        </div>
                        <div class="axis-states">
                            <h5>アナログ入力:</h5>
                            ${gamepad.axes.map((axis, i) => {
                                const axisLabel = ['LeftX', 'LeftY', 'RightX', 'RightY'][i] || `Axis${i}`;
                                return `<span class="axis-state">${axisLabel}: ${axis.toFixed(3)}</span>`;
                            }).join('')}
                        </div>
                        <div class="assignment-info">
                            <h5>割り当て情報:</h5>
                            ${this.getAssignmentInfo()}
                        </div>
                    </div>
                `;
            }
        });

        if (!debugHTML) {
            debugHTML = '<p>接続されているコントローラーがありません</p>';
        }

        this.debugInfoElement.innerHTML = debugHTML;
    }

    getButtonLabels(gamepad) {
        if (gamepad.mapping === 'standard' || gamepad.id.includes('Xbox 360')) {
            return [
                'A', 'B', 'X', 'Y',           // 0-3: アクションボタン
                'LB', 'RB',                   // 4-5: ショルダーボタン
                'LT', 'RT',                   // 6-7: トリガー（アナログ）
                'Back', 'Start',              // 8-9: システムボタン
                'LeftStick', 'RightStick',    // 10-11: スティック押し込み
                'DpadUp', 'DpadDown',         // 12-13: D-pad
                'DpadLeft', 'DpadRight',      // 14-15: D-pad
                'Guide'                       // 16: Xboxボタン
            ];
        }
        return [];
    }

    getAssignmentInfo() {
        if (!this.buttonManager) return '';
        let info = '';
        this.buttonManager.buttons.forEach(button => {
            if (button.assignments.gamepad) {
                info += `<div>${button.name}: ${button.assignments.gamepad}</div>`;
            }
        });
        return info || '<div>割り当てなし</div>';
    }

    testGamepad() {
        debugLog('=== Gamepad Test ===');
        debugLog('Gamepads array:', this.gamepadManager.gamepads);
        
        this.gamepads.forEach((gamepad, index) => {
            if (gamepad) {
                debugLog(`Gamepad ${index}:`, {
                    id: gamepad.id,
                    connected: gamepad.connected,
                    buttons: gamepad.buttons.length,
                    axes: gamepad.axes.length,
                    mapping: gamepad.mapping
                });
                
                // ボタンの状態をテスト
                gamepad.buttons.forEach((button, buttonIndex) => {
                    if (button.pressed) {
                        debugLog(`Button ${buttonIndex} is pressed (value: ${button.value})`);
                    }
                });
            }
        });
        
        this.showNotification('コンソールでテスト結果を確認してください');
        setTimeout(() => this.hideNotification(), 3000);
    }

    refreshGamepads() {
        debugLog('Refreshing gamepads...');
        this.gamepadManager.gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        this.uiManager.updateGamepadStatus(this.gamepadManager.gamepads, this.gamepadManager.gamepadInfo);
        this.showNotification('コントローラーを再検出しました');
        setTimeout(() => this.hideNotification(), 2000);
    }
}

// FightstickVisualizer: 各マネージャーをまとめて初期化・連携
class FightstickVisualizer {
    constructor() {
        this.uiManager = new UIManager();
        this.buttonManager = new ButtonManager(this, this.uiManager);
        this.inputManager = new InputManager(this, this.buttonManager, this.uiManager);
        this.gamepadManager = new GamepadManager(this, this.inputManager, this.uiManager, this.buttonManager);
        this.stateManager = new StateManager(this, this.buttonManager, this.uiManager);
        // UIManagerから各マネージャーを参照できるようにセット
        this.uiManager.gamepadManager = this.gamepadManager;
        this.uiManager.buttonManager = this.buttonManager;
        this.init();
    }
    init() {
        // 保存データがあれば復元、なければ初期ボタン
        const savedState = localStorage.getItem('fightstickState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.buttons && state.assignments) {
                    this.buttonManager.loadSavedState();
                } else {
                    this.buttonManager.createInitialButtons();
                }
            } catch (error) {
                errorLog('保存データの解析に失敗:', error);
                this.buttonManager.createInitialButtons();
            }
        } else {
            this.buttonManager.createInitialButtons();
        }
        this.inputManager.setupEventListeners();
        this.gamepadManager.setupGamepadEvents();
        setTimeout(() => {
            this.gamepadManager.startGamepadPolling();
            this.uiManager.updateStatus();
            this.gamepadManager.refreshGamepads();
        }, 100);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FightstickVisualizer();
}); 