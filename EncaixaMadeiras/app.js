class WoodPuzzleGame {
    constructor() {
        this.cols = 12;
        this.rows = 5;
        this.cellSize = 40;
        this.dragThreshold = 5;
        
        // Controle de Solução Visual
        this.isSolving = false;
        this.abortSolver = false;
        this.solveSpeed = 0

        // OTIMIZAÇÃO: Cache de estados falhos
        this.failedStates = new Set();

        // Definição dos 12 Pentaminós
        this.rawPieces = [
            { name: "Panica", color: "#F4A460",shape: [[1, 1, 1, 1], [1, 0, 0, 0]] },
            { name: "Angelim", color: "#CD853F", shape: [[1, 0, 1], [1, 1, 1]] },
            { name: "Freijo", color: "#DAA520",shape: [[0, 1, 1], [1, 1, 0], [0, 1, 0]] },
            { name: "Patidua", color: "#8B4513",shape: [[1, 1, 1, 1, 1]] },
            { name: "Pau roxo", color: "#800080",shape: [[0, 1, 0], [1, 1, 1], [0, 1, 0]] },
            { name: "Cumaru", color: "#D2691E",shape: [[1, 1, 1, 1], [0, 1, 0, 0]] },
            { name: "Massaranduba", color: "#800000",shape: [[1, 1, 1], [1, 1, 0]] },
            { name: "Pinho", color: "#F0E68C",shape: [[1, 1, 0, 0], [0, 1, 1, 1]] },
            { name: "Zimbonada",  color: "#556B2F",shape: [[1, 1, 1], [0, 1, 0], [0, 1, 0]] },
            { name: "Sapucaia", color: "#FA8072",shape: [[1, 0, 0], [1, 1, 0], [0, 1, 1]] },
            { name: "Pau amarelo",color: "#FFD700", shape: [[1, 1, 0], [0, 1, 0], [0, 1, 1]] },
            { name: "Sucupira", color: "#2F4F4F",shape: [[1, 0, 0], [1, 0, 0], [1, 1, 1]] }
        ];


        this.dom = {
            board: document.getElementById('board'),
            pool: document.getElementById('pieces-pool'),
            modalStuck: document.getElementById('modal-stuck'),
            modalVictory: document.getElementById('modal-victory'),
            btnSolve: document.getElementById('btn-solve'),
            btnRestart: document.getElementById('btn-restart'),
            btnStop: document.getElementById('btn-stop'),
            msgSolving: document.getElementById('solving-msg')
        };

        this.boardState = [];
        this.pieces = [];

        this.init();
    }

    init() {
        this.createBoardGrid();
        this.createPiecesState();
        this.renderAllPieces();
        document.addEventListener('contextmenu', e => e.preventDefault());
    }

    // SOLUÇÃO INSTANTÂNEA (Brute Force sem Delay)
    async solveInstantly() {
        this.restart();
        this.toggleUI(true);
        this.solveSpeed = 0; // Velocidade MÁXIMA (sem animação)
        this.failedStates.clear();
        
        // Ordenação Otimizada: Tenta encaixar as peças "difíceis" primeiro
        // Peças grandes/retas/complexas (X, I, L) costumam ser melhores de colocar antes
        const complexityOrder = ["Patidua", "Pau roxo", "Freijo", "Panica", "Cumaru"];
        
        const sortedPieces = this.pieces.map(p => p).sort((a, b) => {
            const indexA = complexityOrder.indexOf(a.name);
            const indexB = complexityOrder.indexOf(b.name);
            // Se ambos estiverem na lista, o que vem primeiro tem prioridade
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            // Se apenas A estiver, A vem primeiro
            if (indexA !== -1) return -1;
            // Se apenas B estiver, B vem primeiro
            if (indexB !== -1) return 1;
            return 0;
        });

        // Executa o solver
        const solved = await this.solveStep(sortedPieces);
        
        this.toggleUI(false);
        
        if (solved) {
            // Mostra o modal de vitória
            setTimeout(() => { this.dom.modalVictory.style.display = 'flex'; }, 100);
            
            // [OPCIONAL] Imprime a solução no console para você salvar se quiser
            console.log("SOLUÇÃO ENCONTRADA PARA ESTAS PEÇAS:");
            this.pieces.forEach(p => {
                if(p.placed) console.log(`${p.name}: x=${p.x}, y=${p.y}, shape=${JSON.stringify(p.currentShape)}`);
            });
        } else {
            alert("Não há solução possível para este conjunto exato de peças sem espelhamento.");
        }
    }

    solve = async function() {
    this.restart();
    this.solveSpeed = 10; // Rápido, mas visível

    


    // Função auxiliar para posicionar peça manualmente (nome, x, y, rotações)
    const forcePlace = (name, tx, ty, rot) => {
        const piece = this.pieces.find(p => p.name === name);
        if(!piece) return;
        
        // Aplica rotações
        let shape = piece.originalShape;
        for(let i=0; i<rot; i++) shape = this.rotateMatrix(shape);
        
        // Define e coloca
        piece.currentShape = shape;
        this.placePiece(piece, tx, ty);
        this.createPieceDOM(piece); // Atualiza visual
    };

    // --- POSICIONAMENTO ESTRATÉGICO (RESPEITANDO SEUS FORMATOS) ---
    
    // 1. Patidua (I): Deitada na base esquerda (x=0, y=4)
    // Formato original: [[1,1,1,1,1]]
    forcePlace("Patidua", 0, 0, 0);

    // 2. Panica (L): Deitada no topo esquerdo (x=0, y=0)
    // Formato original: [[1,1,1,1], [1,0,0,0]]
    // Ocupa: A1-A4 e B1
    forcePlace("Panica", 8, 0, 0);

    // 3. Massaranduba (P): Encaixada no meio (x=1, y=1)
    // Formato original: [[1,1,1], [1,1,0]]
    // Ocupa: B2-B4 e C2-C3. Encaixa perfeitamente embaixo do L.
    forcePlace("Massaranduba", 1, 1, 0);

    // 4. Cumaru (Y): Em pé, fechando a coluna 0 (x=0, y=1)
    // Rotacionamos 1 vez (90 graus)
    // Formato vira: [[0,1], [1,1], [0,1], [0,1]] (ou similar dependendo da rotação exata)
    // O objetivo é preencher o espaço (0,1), (0,2), (0,3) e conectar no (1,3)
    forcePlace("Cumaru", 0, 1, 3); 

    forcePlace("Sapucaia", 1, 2, 3);
    forcePlace("Zimbonada", 3, 2, 2); 
    forcePlace("Pau roxo", 4, 0, 0); 
    forcePlace("Angelim", 6, 0, 3); 
    forcePlace("Sucupira", 9, 1, 2); 
    forcePlace("Pau amarelo", 9, 2, 0); 
    forcePlace("Freijo", 7, 2, 1); 
    forcePlace("Pinho", 5, 3, 0 ); 
    // --- DEIXA O ALGORITMO TERMINAR O RESTO ---
    
    // Pequena pausa dramática
    /*
    await this.sleep(5000);
    
    // Inicia o solver normal para as peças restantes
    const unplaced = this.pieces.filter(p => !p.placed);
    await this.solveStep(unplaced);
    */
    this.checkGameState();

    };

    createBoardGrid() {
        this.dom.board.innerHTML = '';
        this.boardState = Array(this.rows).fill().map(() => Array(this.cols).fill(null));
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = document.createElement('div');
                cell.className = 'board-cell';
                this.dom.board.appendChild(cell);
            }
        }
    }

    createPiecesState() {
    this.pieces = this.rawPieces.map((data, id) => ({
        id: id,
        name: data.name,
        color: data.color, 
        originalShape: data.shape,
        currentShape: this.copyMatrix(data.shape),
        x: -1, y: -1, placed: false, element: null
    }));
}

    renderAllPieces() {
        this.dom.pool.innerHTML = '';
        this.pieces.forEach(p => {
            this.createPieceDOM(p);
            this.dom.pool.appendChild(p.element);
        });
    }

    createPieceDOM(piece) {
        let el = piece.element;
        if (!el) {
            el = document.createElement('div');
            el.className = 'piece';
            el.id = `p-${piece.id}`;
            this.addDragEvents(el, piece);
            el.addEventListener('dblclick', (e) => { e.stopPropagation(); if(!this.isSolving) this.rotatePiece(piece); });
            el.addEventListener('mousedown', (e) => { if (e.button === 2 && !this.isSolving) this.rotatePiece(piece); });
            piece.element = el;
        } else { el.innerHTML = ''; }

        const shape = piece.currentShape;
        const rows = shape.length;
        const cols = shape[0].length;

        el.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
        el.style.gridTemplateRows = `repeat(${rows}, var(--cell-size))`;
        el.style.width = `${cols * this.cellSize}px`;
        el.style.height = `${rows * this.cellSize}px`;

        let occupiedCount = 0;
        let sumX = 0;
        let sumY = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (shape[r][c] === 1) {
                    const block = document.createElement('div');
                    block.className = 'piece-block';
                    block.style.backgroundImage = `linear-gradient(135deg, ${piece.color} 0%, rgba(0,0,0,0.3) 100%)`;
                    block.style.backgroundColor = piece.color;
                    block.style.borderColor = "rgba(0,0,0,0.2)";
                    block.style.gridColumnStart = c + 1;
                    block.style.gridRowStart = r + 1;
                    el.appendChild(block);
                    sumX += c; sumY += r; occupiedCount++;
                }
            }
        }

        const avgX = sumX / occupiedCount;
        const avgY = sumY / occupiedCount;
        const label = document.createElement('div');
        label.className = 'piece-label';
        label.innerText = piece.name;
        label.style.left = `${(avgX * this.cellSize) + (this.cellSize / 2)}px`;
        label.style.top = `${(avgY * this.cellSize) + (this.cellSize / 2)}px`;
        el.appendChild(label);
    }

    rotatePiece(piece) {
        const newShape = this.rotateMatrix(piece.currentShape);
        if (piece.placed) {
            this.clearBoardState(piece);
            if (this.canPlace(piece.x, piece.y, newShape)) {
                piece.currentShape = newShape;
                this.createPieceDOM(piece);
                this.fillBoardState(piece);
                this.checkGameState();
            } else {
                this.fillBoardState(piece);
                piece.currentShape = newShape;
                this.returnToPool(piece);
                this.createPieceDOM(piece);
            }
        } else {
            piece.currentShape = newShape;
            this.createPieceDOM(piece);
        }
    }

    rotateMatrix(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;
        let newMatrix = Array(cols).fill().map(() => Array(rows).fill(0));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                newMatrix[c][rows - 1 - r] = matrix[r][c];
            }
        }
        return newMatrix;
    }

    addDragEvents(el, piece) {
        let startX, startY, isDragging = false, clone = null, shiftX, shiftY;
        const onMouseDown = (e) => {
            if (e.button !== 0 || this.isSolving) return;
            const rect = el.getBoundingClientRect();
            shiftX = e.clientX - rect.left;
            shiftY = e.clientY - rect.top;
            startX = e.clientX;
            startY = e.clientY;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
        const onMouseMove = (e) => {
            if (!isDragging) {
                if (Math.abs(e.clientX - startX) < this.dragThreshold && Math.abs(e.clientY - startY) < this.dragThreshold) return;
                isDragging = true;
                if (piece.placed) this.clearBoardState(piece);
                clone = el.cloneNode(true);
                clone.style.position = 'fixed';
                clone.style.zIndex = 1000;
                clone.style.pointerEvents = 'none';
                clone.style.opacity = 0.8;
                clone.style.width = el.style.width;
                clone.style.height = el.style.height;
                clone.classList.remove('placed');
                document.body.appendChild(clone);
                el.style.opacity = 0;
            }
            if (clone) {
                clone.style.left = (e.clientX - shiftX) + 'px';
                clone.style.top = (e.clientY - shiftY) + 'px';
            }
        };
        const onMouseUp = (e) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (!isDragging) return;
            if (clone) { clone.remove(); clone = null; }
            el.style.opacity = 1;
            isDragging = false;
            this.tryDrop(e.clientX, e.clientY, piece, shiftX, shiftY);
        };
        el.addEventListener('mousedown', onMouseDown);
    }

    tryDrop(mouseX, mouseY, piece, shiftX, shiftY) {
        const boardRect = this.dom.board.getBoundingClientRect();
        const pieceLeft = mouseX - shiftX;
        const pieceTop = mouseY - shiftY;
        const tol = this.cellSize / 2;

        if (pieceLeft > boardRect.right - tol || 
            pieceLeft + piece.element.offsetWidth < boardRect.left + tol ||
            pieceTop > boardRect.bottom - tol ||
            pieceTop + piece.element.offsetHeight < boardRect.top + tol) {
            this.returnToPool(piece);
            return;
        }

        const gridX = Math.round((pieceLeft - boardRect.left) / this.cellSize);
        const gridY = Math.round((pieceTop - boardRect.top) / this.cellSize);

        if (this.canPlace(gridX, gridY, piece.currentShape)) {
            this.placePiece(piece, gridX, gridY);
            this.checkGameState();
        } else {
            this.returnToPool(piece);
        }
    }

    canPlace(gx, gy, shape) {
        const rows = shape.length;
        const cols = shape[0].length;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (shape[r][c] === 1) {
                    const bx = gx + c;
                    const by = gy + r;
                    if (bx < 0 || bx >= this.cols || by < 0 || by >= this.rows) return false;
                    if (this.boardState[by][bx] !== null) return false;
                }
            }
        }
        return true;
    }

    placePiece(piece, x, y) {
        piece.x = x; piece.y = y; piece.placed = true;
        piece.element.classList.add('placed');
        piece.element.style.left = (x * this.cellSize) + 'px';
        piece.element.style.top = (y * this.cellSize) + 'px';
        this.dom.board.appendChild(piece.element);
        this.fillBoardState(piece);
    }

    returnToPool(piece) {
        if (piece.placed) this.clearBoardState(piece);
        piece.x = -1; piece.y = -1; piece.placed = false;
        piece.element.classList.remove('placed');
        piece.element.style.position = '';
        piece.element.style.left = '';
        piece.element.style.top = '';
        this.dom.pool.appendChild(piece.element);
    }

    fillBoardState(piece) {
        const shape = piece.currentShape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[0].length; c++) {
                if (shape[r][c] === 1) this.boardState[piece.y + r][piece.x + c] = piece.id;
            }
        }
    }

    clearBoardState(piece) {
        const shape = piece.currentShape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[0].length; c++) {
                if (shape[r][c] === 1) {
                    if (this.boardState[piece.y + r] && this.boardState[piece.y + r][piece.x + c] === piece.id) {
                        this.boardState[piece.y + r][piece.x + c] = null;
                    }
                }
            }
        }
    }

    checkGameState() {
        if (this.isSolving) return;

        const unplaced = this.pieces.filter(p => !p.placed);
        if (unplaced.length === 0) {
            setTimeout(() => { this.dom.modalVictory.style.display = 'flex'; }, 300);
            return;
        }
        if (unplaced.length === 1) {
            const lastPiece = unplaced[0];
            if (!this.canPieceFitAnywhere(lastPiece)) {
                setTimeout(() => { this.dom.modalStuck.style.display = 'flex'; }, 500);
            }
        }
    }

    canPieceFitAnywhere(piece) {
        let testShape = this.copyMatrix(piece.currentShape);
        for (let i = 0; i < 4; i++) {
            for (let y = 0; y <= this.rows - testShape.length; y++) {
                for (let x = 0; x <= this.cols - testShape[0].length; x++) {
                    if (this.canPlace(x, y, testShape)) return true;
                }
            }
            testShape = this.rotateMatrix(testShape);
        }
        return false;
    }

    // --- LÓGICA DE CONTROLE ---
    restart() {
        this.stopSolving();
        this.dom.modalStuck.style.display = 'none';
        this.dom.modalVictory.style.display = 'none';
        this.boardState = Array(this.rows).fill().map(() => Array(this.cols).fill(null));
        this.pieces.forEach(p => {
            p.currentShape = this.copyMatrix(p.originalShape);
            this.returnToPool(p);
            this.createPieceDOM(p); 
        });
    }

    toggleUI(solving) {
        this.isSolving = solving;
        this.dom.btnSolve.disabled = solving;
        this.dom.btnRestart.disabled = solving;
        this.dom.btnStop.style.display = solving ? 'block' : 'none';
        this.dom.msgSolving.style.display = solving ? 'block' : 'none';
        this.dom.modalStuck.style.display = 'none';
        this.dom.modalVictory.style.display = 'none';
        this.dom.pool.style.pointerEvents = solving ? 'none' : 'auto';
    }

    stopSolving() {
        if (this.isSolving) {
            this.abortSolver = true;
        }
    }

    // --- OTIMIZAÇÃO: GERADOR DE HASH PARA ESTADO ---
    // Cria uma string única baseada no tabuleiro atual E nas peças disponíveis
    getStateHash(availablePieces) {
        // 1. Representação binária do tabuleiro (0 = vazio, 1 = cheio)
        let boardStr = "";
        for(let r=0; r<this.rows; r++) {
            for(let c=0; c<this.cols; c++) {
                boardStr += (this.boardState[r][c] === null ? '0' : '1');
            }
        }
        // 2. Peças restantes (ordenadas para garantir unicidade)
        const piecesStr = availablePieces.map(p => p.id).sort((a,b) => a-b).join('-');
        
        return boardStr + "|" + piecesStr;
    }

    // --- SOLUCIONADOR VISUAL ASSÍNCRONO COM MEMOIZATION ---

    async startVisualSolver() {
        this.restart();
        this.toggleUI(true);
        this.abortSolver = false;
        this.failedStates.clear(); // Limpa o cache a cada novo jogo
        
        // Embaralha para variar as tentativas iniciais
        const unplacedPieces = this.pieces.map(p => p).sort(() => Math.random() - 0.5);
        
        const solved = await this.solveStep(unplacedPieces);
        
        this.toggleUI(false);
        if (solved) {
            setTimeout(() => { this.dom.modalVictory.style.display = 'flex'; }, 300);
        } else if (!this.abortSolver) {
            alert("Solução não encontrada com a semente atual.");
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async solveStep(availablePieces) {
        if (this.abortSolver) return false;

        // [MEMOIZATION - CHECK] 
        // Se já estivemos nessa situação e falhamos, não tente de novo.
        const currentHash = this.getStateHash(availablePieces);
        if (this.failedStates.has(currentHash)) {
            return false;
        }

        // 1. Encontra o primeiro espaço vazio
        let emptyX = -1, emptyY = -1;
        search:
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.boardState[y][x] === null) {
                    emptyX = x; emptyY = y;
                    break search;
                }
            }
        }

        // Caso base: Tabuleiro cheio = Vitória
        if (emptyX === -1) return availablePieces.length === 0;

        // 
        // O algoritmo tenta os ramos. Se um ramo falha, ele é cortado (pruning)
        // e salvo na memória para não ser visitado novamente.

        for (let i = 0; i < availablePieces.length; i++) {
            if (this.abortSolver) return false;
            
            const piece = availablePieces[i];
            let testShape = this.copyMatrix(piece.originalShape);

            for (let rot = 0; rot < 4; rot++) {
                if (this.abortSolver) return false;

                const anchors = this.getPieceAnchors(testShape);
                
                if (anchors.length > 0) {
                    const anchor = anchors[0];
                    const placeX = emptyX - anchor.c;
                    const placeY = emptyY - anchor.r;

                    if (this.canPlace(placeX, placeY, testShape)) {
                        
                        piece.currentShape = testShape;
                        this.createPieceDOM(piece);
                        this.placePiece(piece, placeX, placeY);
                        
                        await this.sleep(this.solveSpeed);

                        // Validação de "Ilhas" (Flood Fill)
                        if (this.hasUnfillableHoles()) {
                            this.returnToPool(piece);
                        } else {
                            const remaining = availablePieces.filter((_, idx) => idx !== i);
                            if (await this.solveStep(remaining)) return true;
                            
                            // Backtrack
                            this.returnToPool(piece);
                        }
                    }
                }
                testShape = this.rotateMatrix(testShape);
            }
        }

        // [MEMOIZATION - SAVE]
        // Se passamos por todas as peças e nenhuma funcionou para este estado,
        // este estado é um beco sem saída. Memorize isso.
        this.failedStates.add(currentHash);
        
        return false;
    }

    hasUnfillableHoles() {
        const visited = Array(this.rows).fill().map(() => Array(this.cols).fill(false));
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.boardState[y][x] === null && !visited[y][x]) {
                    const size = this.floodFillCount(x, y, visited);
                    if (size % 5 !== 0) return true;
                }
            }
        }
        return false;
    }

    floodFillCount(startX, startY, visited) {
        let count = 0;
        const stack = [[startX, startY]];
        visited[startY][startX] = true;

        while(stack.length > 0) {
            const [cx, cy] = stack.pop();
            count++;
            const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
            for (let d of dirs) {
                const nx = cx + d[0];
                const ny = cy + d[1];
                if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                    if (this.boardState[ny][nx] === null && !visited[ny][nx]) {
                        visited[ny][nx] = true;
                        stack.push([nx, ny]);
                    }
                }
            }
        }
        return count;
    }

    getPieceAnchors(shape) {
        const anchors = [];
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[0].length; c++) {
                if (shape[r][c] === 1) {
                    anchors.push({r, c});
                    return anchors;
                }
            }
        }
        return anchors;
    }

    copyMatrix(m) { return m.map(row => [...row]); }
}

const game = new WoodPuzzleGame();
