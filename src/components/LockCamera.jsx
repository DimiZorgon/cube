import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const CustomLockControls = ({ isLocked, cameraMapping }) => {
    // useThree nous permet de récupérer la caméra et le Canvas (gl)
    const { camera, gl } = useThree();

    // useRef permet de stocker des valeurs sans recharger le composant
    const isDragging = useRef(false);
    const previousX = useRef(0);

    useEffect(() => {
        // Si on n'est pas verrouillé, on désactive nos écouteurs
        if (!isLocked) return;
        const axisVector = new THREE.Vector3(
            cameraMapping.Up.axis === 'x' ? cameraMapping.Up.value : 0,
            cameraMapping.Up.axis === 'y' ? cameraMapping.Up.value : 0,
            cameraMapping.Up.axis === 'z' ? cameraMapping.Up.value : 0

        );


        const onPointerDown = (e) => {
            isDragging.current = true;
            previousX.current = e.clientX;
        };

        const onPointerMove = (e) => {
            if (!isDragging.current) return;

            // On calcule de combien de pixels la souris a bougé vers la gauche/droite
            const deltaX = e.clientX - previousX.current;
            const rotationSpeed = 0.01; // Ajuste cette valeur pour la sensibilité

            // Utilise la méthode native de ThreeJS pour tourner la position de la caméra
            camera.position.applyAxisAngle(axisVector, -deltaX * rotationSpeed);
            // Et force la caméra à regarder le centre du cube (0,0,0) :
            camera.lookAt(0, 0, 0);

            // Mettre à jour previousX pour le prochain mouvement
            previousX.current = e.clientX;
        };

        const onPointerUp = () => {
            isDragging.current = false;
        };

        // On attache nos événements au Canvas (gl.domElement)
        gl.domElement.addEventListener('pointerdown', onPointerDown);
        gl.domElement.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        // Fonction de nettoyage
        return () => {
            gl.domElement.removeEventListener('pointerdown', onPointerDown);
            gl.domElement.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [isLocked, camera, gl, cameraMapping]);

    return null;
};
