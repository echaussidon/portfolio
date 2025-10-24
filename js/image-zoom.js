// JS pour le zoom sur l'image du projet 1 (research.html)
document.addEventListener('DOMContentLoaded', function() {
    // Pour chaque image zoomable, gère son propre modal
    document.querySelectorAll('.project-img .zoomable-img').forEach(function(img) {
        // Trouve le modal associé (le sibling suivant dans le DOM)
        let parent = img.closest('.project-img');
        let modal = parent ? parent.querySelector('.zoom-modal') : null;
        if (!modal) return;
        const modalBg = modal.querySelector('.zoom-modal-bg');
        const modalImg = modal.querySelector('.zoom-modal-img');
        if (!modalBg || !modalImg) return;

        // Ouvre le modal au clic sur l'image
        img.addEventListener('click', function() {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
        // Ferme le modal au clic sur le fond ou l'image
        [modalBg, modalImg].forEach(el => {
            el.addEventListener('click', function() {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            });
        });
        // Ferme le modal avec la touche ESC
        document.addEventListener('keydown', function(e) {
            if (modal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        });
    });
});
