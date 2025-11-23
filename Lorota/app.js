// Aguarda o DOM carregar antes de executar o script
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DADOS DO JOGO (Mock do dicionario.csv) ---
    // Em um app real, isso viria de um arquivo ou API.
    // Para rodar localmente, 'hardcodamos' o dicionário.
    const DICIONARIO = [
        { palavra: "Abnóxio", significado: "Pessoa desagradável ou tola." },
        { palavra: "Filantropo", significado: "Pessoa que pratica a caridade." },
        { palavra: "Quimera", significado: "Uma ilusão ou fantasia impossível." },
        { palavra: "Prolegômenos", significado: "Princípios ou noções introdutórias." },
        { palavra: "Sápido", significado: "Que tem sabor; saboroso." },
        { palavra: "Recôndito", significado: "Oculto, escondido, profundo." },
        { palavra: "Perfunctório", significado: "Feito superficialmente, de má vontade." },
        { palavra: "Verossimilhança", significado: "Aparência de verdade; que parece real." },
        { palavra: "Inócuo", significado: "Que não causa dano; inofensivo." },
        { palavra: "Balbúrdia", significado: "Confusão, desordem, baderna." },
        { palavra: "Ignóbil", significado: "Que não é nobre; vil, baixo." },
        { palavra: "Conspícuo", significado: "Que é notável, visível, ilustre." }
    ];
    const TOTAL_RODADAS = 10;

    // --- 2. SELEÇÃO DE ELEMENTOS DO DOM ---
    const screens = {
        login: document.getElementById('login-screen'),
        submission: document.getElementById('submission-screen'),
        voting: document.getElementById('voting-screen'),
        reveal: document.getElementById('reveal-screen'),
        end: document.getElementById('end-game-screen'),
    };
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const userTableBody = document.querySelector('#user-table tbody');
    const startGameBtn = document.getElementById('start-game-btn');

    const roundTitle = document.getElementById('round-title');
    const scoreboardSub = document.getElementById('scoreboard-sub');
    const currentWordEl = document.getElementById('current-word');
    const submissionForm = document.getElementById('submission-form');
    const definitionInput = document.getElementById('definition-input');
    const waitSubmission = document.getElementById('wait-submission');
    const submissionStatusList = document.getElementById('submission-status-list');

    const roundTitleVote = document.getElementById('round-title-vote');
    const scoreboardVote = document.getElementById('scoreboard-vote');
    const currentWordVoteEl = document.getElementById('current-word-vote');
    const votingForm = document.getElementById('voting-form');
    const optionsContainer = document.getElementById('options-container');
    const waitVoting = document.getElementById('wait-voting');
    const votingStatusList = document.getElementById('voting-status-list');

    const roundTitleReveal = document.getElementById('round-title-reveal');
    const revealWordEl = document.getElementById('reveal-word');
    const correctDefinitionEl = document.getElementById('correct-definition');
    const revealResultsEl = document.getElementById('reveal-results');
    const scoreboardReveal = document.getElementById('scoreboard-reveal');
    const nextRoundBtn = document.getElementById('next-round-btn');

    const winnerText = document.getElementById('winner-text');
    const scoreboardFinal = document.getElementById('scoreboard-final');
    const resetGameBtn = document.getElementById('reset-game-btn');

    // --- 3. GERENCIAMENTO DE ESTADO (LocalStorage) ---
    
    // Define a estrutura inicial do estado do jogo
    const getInitialState = () => ({
        status: 'login', // 'login', 'submission', 'voting', 'reveal', 'end'
        round: 0,
        users: [], // { id: 'admin', name: 'admin', score: 0 }
        palavrasUsadas: [], // Índices do DICIONARIO
        currentRoundData: {
            palavra: '',
            significado: '',
            submissions: [], // { userId: 'admin', text: '...'}
            votes: [], // { voterId: 'player1', votedForUserId: 'player2' | 'correct' }
        }
    });

    // Função para ler o estado do LocalStorage
    const getGameState = () => {
        const state = localStorage.getItem('lorotaGameState');
        return state ? JSON.parse(state) : getInitialState();
    };

    // Função para salvar o estado no LocalStorage
    // Esta é a função-chave que dispara o evento 'storage' para outras abas
    const setGameState = (newState) => {
        localStorage.setItem('lorotaGameState', JSON.stringify(newState));
        // Dispara manualmente a renderização na *própria* aba,
        // pois o evento 'storage' só dispara em *outras* abas.
        render(newState);
    };

    // Guarda o ID do usuário *desta aba* no SessionStorage (que é específico da aba)
    const setMyUser = (userId) => {
        sessionStorage.setItem('lorotaUserId', userId);
    };
    
    const getMyUser = () => {
        return sessionStorage.getItem('lorotaUserId');
    };

    // --- 4. LÓGICA DE RENDERIZAÇÃO (Atualizar UI) ---

    // Função principal que lê o estado e atualiza a UI
    const render = (state) => {
        // Esconde todas as telas
        Object.values(screens).forEach(screen => screen.classList.remove('active'));

        const myUserId = getMyUser();

        // Mostra a tela correta baseada no estado
        switch (state.status) {
            case 'login':
                screens.login.classList.add('active');
                renderLogin(state, myUserId);
                break;
            case 'submission':
                screens.submission.classList.add('active');
                renderSubmission(state, myUserId);
                break;
            case 'voting':
                screens.voting.classList.add('active');
                renderVoting(state, myUserId);
                break;
            case 'reveal':
                screens.reveal.classList.add('active');
                renderReveal(state, myUserId);
                break;
            case 'end':
                screens.end.classList.add('active');
                renderEnd(state, myUserId);
                break;
        }
    };

    // Funções de renderização específicas para cada tela
    
    const renderLogin = (state, myUserId) => {
        // Popula a tabela de usuários
        userTableBody.innerHTML = '';
        state.users.forEach(user => {
            const row = userTableBody.insertRow();
            const cell = row.insertCell();
            cell.textContent = user.name;
            if (user.id === myUserId) {
                cell.textContent += ' (Você)';
                cell.style.fontWeight = 'bold';
            }
        });

        // Se o usuário 'admin' estiver na lista E *esta aba* for o admin,
        // mostra o botão de iniciar.
        const isAdmin = myUserId === 'admin';
        const adminExists = state.users.some(u => u.id === 'admin');
        
        if (isAdmin && adminExists) {
            startGameBtn.classList.remove('hidden');
        } else {
            startGameBtn.classList.add('hidden');
        }

        // Se eu já estou logado, desabilito o formulário
        if (myUserId) {
            loginForm.style.display = 'none';
        } else {
            loginForm.style.display = 'block';
        }
    };

    const renderSubmission = (state, myUserId) => {
        const { round, users, currentRoundData } = state;
        const { palavra, submissions } = currentRoundData;

        // Atualiza títulos e scoreboard
        roundTitle.textContent = `Rodada ${round}/${TOTAL_RODADAS}`;
        scoreboardSub.innerHTML = getScoreboardHTML(users);
        currentWordEl.textContent = palavra;

        const mySubmission = submissions.find(s => s.userId === myUserId);
        
        if (mySubmission) {
            // Se eu já submeti, mostro a tela de espera
            submissionForm.classList.add('hidden');
            waitSubmission.classList.remove('hidden');
            renderStatusList(submissionStatusList, users, submissions, 'userId');
        } else {
            // Se não submeti, mostro o formulário
            submissionForm.classList.remove('hidden');
            waitSubmission.classList.add('hidden');
            definitionInput.value = ''; // Limpa o campo
        }
    };

    const renderVoting = (state, myUserId) => {
        const { round, users, currentRoundData } = state;
        const { palavra, submissions, votes } = currentRoundData;

        // Atualiza títulos e scoreboard
        roundTitleVote.textContent = `Rodada ${round}/${TOTAL_RODADAS}`;
        scoreboardVote.innerHTML = getScoreboardHTML(users);
        currentWordVoteEl.textContent = palavra;

        const myVote = votes.find(v => v.voterId === myUserId);
        
        if (myVote) {
            // Se eu já votei, mostro a tela de espera
            votingForm.classList.add('hidden');
            waitVoting.classList.remove('hidden');
            renderStatusList(votingStatusList, users, votes, 'voterId');
        } else {
            // Se não votei, mostro as opções
            votingForm.classList.remove('hidden');
            waitVoting.classList.add('hidden');
            
            // Constrói as opções de voto
            let options = [];
            // 1. A resposta correta
            options.push({ id: 'correct', text: currentRoundData.significado });
            
            // 2. As respostas dos *outros* usuários
            submissions.forEach(sub => {
                // Eu não devo ver minha própria submissão (se eu fiz uma)
                if (sub.userId !== myUserId) {
                    options.push({ id: sub.userId, text: sub.text });
                }
            });

            // Embaralha as opções
            shuffleArray(options);

            // Renderiza as opções
            optionsContainer.innerHTML = '';
            options.forEach(option => {
                optionsContainer.innerHTML += `
                    <label class="option">
                        <input type="radio" name="vote" value="${option.id}" required>
                        <span>${sanitize(option.text)}</span>
                    </label>
                `;
            });
        }
    };

    const renderReveal = (state, myUserId) => {
        const { round, users, currentRoundData } = state;
        const { palavra, significado, submissions, votes } = currentRoundData;

        roundTitleReveal.textContent = round;
        revealWordEl.textContent = palavra;
        correctDefinitionEl.textContent = significado;

        // Monta os resultados
        revealResultsEl.innerHTML = '';
        
        // 1. Quem votou no correto?
        const correctVotes = votes.filter(v => v.votedForUserId === 'correct');
        revealResultsEl.innerHTML += buildVoteGroupHTML('Resposta Correta', significado, correctVotes, users);

        // 2. Quem votou em cada lorota?
        submissions.forEach(sub => {
            const user = users.find(u => u.id === sub.userId);
            const userVotes = votes.filter(v => v.votedForUserId === sub.userId);
            revealResultsEl.innerHTML += buildVoteGroupHTML(`${user.name} escreveu:`, sub.text, userVotes, users);
        });

        // Mostra o scoreboard
        scoreboardReveal.innerHTML = getScoreboardHTML(users, true);

        // Apenas o admin vê o botão de próxima rodada
        if (myUserId === 'admin') {
            nextRoundBtn.classList.remove('hidden');
            if (round === TOTAL_RODADAS) {
                nextRoundBtn.textContent = 'Ver Resultado Final';
            } else {
                nextRoundBtn.textContent = 'Próxima Rodada';
            }
        } else {
            nextRoundBtn.classList.add('hidden');
        }
    };

    const renderEnd = (state, myUserId) => {
        const { users } = state;
        
        // Encontra o vencedor
        const sortedUsers = [...users].sort((a, b) => b.score - a.score);
        const winner = sortedUsers[0];
        
        if (sortedUsers.length > 1 && sortedUsers[0].score === sortedUsers[1].score) {
            winnerText.textContent = "Houve um empate!";
        } else {
            winnerText.textContent = `O(a) vencedor(a) é ${winner.name}!`;
        }

        scoreboardFinal.innerHTML = getScoreboardHTML(users, true);

        // Apenas o admin pode reiniciar
        if (myUserId === 'admin') {
            resetGameBtn.classList.remove('hidden');
        } else {
            resetGameBtn.classList.add('hidden');
        }
    };


    // --- 5. FUNÇÕES AUXILIARES DE RENDERIZAÇÃO ---
    
    // Gera o HTML do placar
    const getScoreboardHTML = (users, isFinal = false) => {
        const sortedUsers = [...users].sort((a, b) => b.score - a.score);
        return sortedUsers.map(user => 
            `<div>${user.name}: ${user.score} ponto(s)</div>`
        ).join('');
    };

    // Gera a lista de status (quem já submeteu/votou)
    const renderStatusList = (listElement, users, items, keyField) => {
        listElement.innerHTML = '';
        users.forEach(user => {
            const hasItem = items.some(item => item[keyField] === user.id);
            const li = document.createElement('li');
            li.textContent = user.name;
            if (hasItem) {
                li.classList.add('completed');
            }
            listElement.appendChild(li);
        });
    };

    // Gera o HTML para os grupos de votos na tela de revelação
    const buildVoteGroupHTML = (title, text, votes, users) => {
        let votersHTML = '<ul>';
        if (votes.length > 0) {
            votersHTML += votes.map(vote => {
                const voter = users.find(u => u.id === vote.voterId);
                return `<li>${voter.name}</li>`;
            }).join('');
        } else {
            votersHTML += '<li>Ninguém votou aqui.</li>';
        }
        votersHTML += '</ul>';

        return `
            <div class="vote-group">
                <p>${title}</p>
                <blockquote>"${sanitize(text)}"</blockquote>
                <p>Quem votou:</p>
                ${votersHTML}
            </div>
        `;
    };

    // Função para embaralhar arrays (Fisher-Yates)
    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    };

    // Função simples para evitar XSS (HTML Injection)
    const sanitize = (str) => {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    };

    // --- 6. MANIPULADORES DE EVENTOS (Ações do Usuário) ---

    // Evento: Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = usernameInput.value.trim();
        // Validação (redundante com o 'pattern', mas boa prática)
        if (!/^[a-zA-Z0-9]+$/.test(name)) {
            alert('Nome de usuário inválido. Use apenas letras e números.');
            return;
        }

        const state = getGameState();
        if (state.users.some(u => u.id === name.toLowerCase())) {
            alert('Este nome de usuário já está em uso.');
            return;
        }

        const userId = name.toLowerCase();
        const newUser = { id: userId, name: name, score: 0 };
        
        state.users.push(newUser);
        setMyUser(userId); // Define este usuário para esta aba
        setGameState(state);
    });

    // Evento: Admin clica em "Iniciar Jogo"
    startGameBtn.addEventListener('click', () => {
        const state = getGameState();
        
        // Não pode começar com menos de 2 jogadores (admin + 1)
        if (state.users.length < 2) {
            alert('Precisa de pelo menos 2 jogadores para começar.');
            return;
        }
        
        startRound(state);
    });

    // Evento: Usuário submete uma definição
    submissionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = definitionInput.value.trim();
        if (!text) return; // Não permite submissão vazia

        const myUserId = getMyUser();
        const state = getGameState();

        // Adiciona a submissão
        state.currentRoundData.submissions.push({
            userId: myUserId,
            text: text
        });

        // Verifica se todos submeteram
        if (state.currentRoundData.submissions.length === state.users.length) {
            // Todos submeteram, avança para votação
            state.status = 'voting';
        }

        setGameState(state);
    });

    // Evento: Usuário vota em uma definição
    votingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedOption = votingForm.querySelector('input[name="vote"]:checked');
        
        if (!selectedOption) {
            alert('Você deve escolher uma opção.');
            return;
        }

        const votedForUserId = selectedOption.value; // Pode ser 'correct' ou um ID de usuário
        const myUserId = getMyUser();
        const state = getGameState();

        // Adiciona o voto
        state.currentRoundData.votes.push({
            voterId: myUserId,
            votedForUserId: votedForUserId
        });

        // Verifica se todos votaram
        if (state.currentRoundData.votes.length === state.users.length) {
            // Todos votaram, calcula pontos e avança para revelação
            calculateScores(state);
            state.status = 'reveal';
        }

        setGameState(state);
    });

    // Evento: Admin clica em "Próxima Rodada"
    nextRoundBtn.addEventListener('click', () => {
        const state = getGameState();
        
        if (state.round === TOTAL_RODADAS) {
            // Fim de jogo
            state.status = 'end';
            setGameState(state);
        } else {
            // Próxima rodada
            startRound(state);
        }
    });

    // Evento: Admin clica em "Jogar Novamente"
    resetGameBtn.addEventListener('click', () => {
        // Reseta o jogo para o estado inicial
        // Isso vai "chutar" todos para a tela de login
        setGameState(getInitialState());
        setMyUser(null); // Limpa o usuário da aba
        // Recarrega a página para limpar o sessionStorage (mais fácil)
        location.reload(); 
    });


    // --- 7. LÓGICA DO JOGO (Cérebro) ---

    // Inicia uma nova rodada
    const startRound = (state) => {
        state.round += 1;
        state.status = 'submission';
        
        // Pega uma nova palavra
        let newWordIndex;
        do {
            newWordIndex = Math.floor(Math.random() * DICIONARIO.length);
        } while (state.palavrasUsadas.includes(newWordIndex)); // Garante que não repete

        state.palavrasUsadas.push(newWordIndex);
        const wordData = DICIONARIO[newWordIndex];

        // Reseta os dados da rodada
        state.currentRoundData = {
            palavra: wordData.palavra,
            significado: wordData.significado,
            submissions: [],
            votes: []
        };

        setGameState(state);
    };

    // Calcula a pontuação no final da rodada
    const calculateScores = (state) => {
        const { users, currentRoundData } = state;
        const { submissions, votes } = currentRoundData;

        // Cria um mapa de ganhos de pontos para facilitar
        const pointsGained = {}; // { userId: 0 }
        users.forEach(u => pointsGained[u.id] = 0);

        votes.forEach(vote => {
            if (vote.votedForUserId === 'correct') {
                // +2 pontos por acertar a correta
                pointsGained[vote.voterId] += 2;
            } else {
                // +1 ponto para quem escreveu a lorota votada
                const lorotaOwnerId = vote.votedForUserId;
                if (pointsGained[lorotaOwnerId] !== undefined) {
                    pointsGained[lorotaOwnerId] += 1;
                }
            }
        });

        // Atualiza a pontuação total dos usuários
        state.users.forEach(user => {
            user.score += pointsGained[user.id];
        });
        
        // O estado será salvo pela função 'handleVote'
    };


    // --- 8. INICIALIZAÇÃO E SINCRONIZAÇÃO ---

    // Event Listener para 'storage'
    // Isso é o que sincroniza as abas!
    window.addEventListener('storage', (e) => {
        if (e.key === 'lorotaGameState') {
            // O estado mudou em outra aba.
            // Apenas renderiza o novo estado.
            render(JSON.parse(e.newValue));
        }
    });

    // Inicialização da página
    // Limpa o estado se for um reload forçado
    if (performance.navigation.type === 1) { // 1 = Reload
        // Se a página foi recarregada, precisamos limpar o usuário da sessão
        // Mas manter o estado do jogo (caso ele tenha recarregado sem querer)
        setMyUser(null); // Força o login novamente
    }

    // Renderiza o estado atual ao carregar a página
    render(getGameState());

    // Se o estado do jogo não for 'login', mas eu não tiver um usuário
    // (ex: entrei no meio do jogo), eu sou forçado a ir para o login.
    const initialState = getGameState();
    const myUser = getMyUser();
    if (initialState.status !== 'login' && !myUser) {
        alert('O jogo já começou. Aguarde a próxima rodada ou reinicie.');
        // Força a redefinição para esta aba
        setMyUser(null);
        render(getInitialState());
        // (idealmente, teria um modo "espectador", mas isso é mais simples)
    }
});