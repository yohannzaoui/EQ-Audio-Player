const fileInput = document.getElementById('fileInput');
const audioElement = document.getElementById('audioSource');

fileInput.onchange = function(e) {
    const files = e.target.files;
    if (files.length > 0) {
        // Crée une URL locale pour le fichier sélectionné
        const fileURL = URL.createObjectURL(files[0]);
        
        // On l'assigne à la source du lecteur audio
        audioElement.src = fileURL;
        
        // On charge et on joue
        audioElement.load();
        audioElement.play();
    }
};
