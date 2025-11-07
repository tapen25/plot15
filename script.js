document.addEventListener('DOMContentLoaded', () => {

    // --- Web Audio API のセットアップ ---
    // AudioContextの初期化 (ブラウザ互換性のため)
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext; // 初期化はユーザーの最初の操作時に行う

    // 各オーディオの音量を制御するためのノードを格納する配列
    const gainNodes = [];
    
    // オーディオが初期化され、再生が開始されたかどうかのフラグ
    let isInitialized = false;

    // オーディオファイルのパス
    const audioFiles = ['audio/kanon1.mp3', 'audio/kanon2.mp3', 'audio/kanon3.mp3']; // .oggでも可

    // --- DOM要素の取得 ---
    const btnStatic = document.getElementById('btnStatic');
    const btnWalk = document.getElementById('btnWalk');
    const btnRun = document.getElementById('btnRun');
    const allButtons = [btnStatic, btnWalk, btnRun];

    /**
     * オーディオファイルを非同期で読み込み、デコードする関数
     * @param {string} url - オーディオファイルのURL
     * @returns {Promise<AudioBuffer>} - デコードされたオーディオデータ
     */
    async function loadAudio(url) {
        if (!audioContext) {
            audioContext = new AudioContext();
        }
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        // ArrayBufferをAudioBufferにデコード
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        return audioBuffer;
    }

    /**
     * すべてのオーディオを初期化し、ループ再生を開始する関数
     * (ユーザーの最初のクリック時に一度だけ実行される)
     */
    async function setupAndStartAudio() {
        // 既に初期化済みなら何もしない
        if (isInitialized) return;
        
        console.log('AudioContextを初期化・再開します...');
        // (iOSなどで必要) ユーザー操作によりAudioContextを再開
        if (audioContext && audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        try {
            // 3つのファイルを並行して読み込む
            const loadPromises = audioFiles.map(loadAudio);
            const audioBuffers = await Promise.all(loadPromises);

            // 読み込んだバッファそれぞれに対して再生ノードと音量ノードを設定
            audioBuffers.forEach((buffer, index) => {
                // 1. 音量コントローラー (GainNode) を作成
                const gainNode = audioContext.createGain();
                // 初期音量は0 (ミュート)
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                // GainNodeを最終出力先 (スピーカー) に接続
                gainNode.connect(audioContext.destination);
                
                // 2. 再生ソース (BufferSource) を作成
                const source = audioContext.createBufferSource();
                // デコードしたオーディオデータをセット
                source.buffer = buffer;
                // ループ再生を有効にする
                source.loop = true;
                
                // 3. ソースをGainNodeに接続
                // (Source -> Gain -> Destination)
                source.connect(gainNode);

                // 4. 再生を開始
                source.start(0); // 0は「今すぐ」再生開始

                // 5. 後で音量を制御できるようにGainNodeを保存
                gainNodes[index] = gainNode;
            });

            isInitialized = true;
            console.log('すべてのオーディオのループ再生を開始しました。');

        } catch (error) {
            console.error('オーディオの読み込みまたはデコードに失敗しました:', error);
            alert('オーディオの読み込みに失敗しました。');
        }
    }

    /**
     * 指定された状態の音量を上げ、他を下げる関数
     * @param {number} activeIndex - アクティブにする状態のインデックス (0, 1, または 2)
     */
    function setAudioState(activeIndex) {
        if (!isInitialized) {
            console.warn('オーディオがまだ初期化されていません。');
            return;
        }

        // すべてのGainNodeをループ
        gainNodes.forEach((gainNode, index) => {
            const targetVolume = (index === activeIndex) ? 1.0 : 0.0;

            // 音量を滑らかに変更 (0.01秒かけて変更し、「ブツッ」音を防ぐ)
            gainNode.gain.setTargetAtTime(targetVolume, audioContext.currentTime, 0.01);
        });

        // ボタンのアクティブ状態を更新
        allButtons.forEach((btn, index) => {
            if (index === activeIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        console.log(`状態 ${activeIndex + 1} をアクティブにしました。`);
    }

    // --- イベントリスナーの設定 ---
    // async/awaitを使うため、コールバックをasyncにする
    btnStatic.addEventListener('click', async () => {
        // 最初のクリックで初期化を実行
        await setupAndStartAudio();
        // 状態をセット
        setAudioState(0); // 0 = 静止
    });

    btnWalk.addEventListener('click', async () => {
        await setupAndStartAudio();
        setAudioState(1); // 1 = 歩行
    });

    btnRun.addEventListener('click', async () => {
        await setupAndStartAudio();
        setAudioState(2); // 2 = 早歩き
    });

});