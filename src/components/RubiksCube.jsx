// src/components/RubiksCube.jsx
import React, { useRef, useLayoutEffect, useEffect } from 'react';
import * as THREE from 'three';
import { Cubie } from './Cubie';
import { useCubeStore } from '../store/useCubeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useFrame, useThree } from '@react-three/fiber';

const DICO_AXIS = { x: 0, y: 1, z: 2 };

export function RubiksCube({ enableSwipe = false, onSwipeMove, controlsRef, isLocked = false }) {
    const size = useCubeStore(state => state.size);
    const cubiesData = useCubeStore(state => state.cubies);
    const activeRotation = useCubeStore(state => state.activeRotation);
    const commitRotation = useCubeStore(state => state.commitRotation);

    const cubeScale = useSettingsStore(state => state.cubeScale);
    const turnSpeed = useSettingsStore(state => state.turnSpeed);

    const { camera, gl } = useThree();

    const cubeGroupRef = useRef(null);
    const pivotRefs = useRef({});
    const currentAngle = useRef(0);
    const committedRef = useRef(false);

    const activeRotationRef = useRef(activeRotation);
    useEffect(() => {
        activeRotationRef.current = activeRotation;
    }, [activeRotation]);

    const onSwipeMoveRef = useRef(onSwipeMove);
    useEffect(() => {
        onSwipeMoveRef.current = onSwipeMove;
    }, [onSwipeMove]);

    const isLockedRef = useRef(isLocked);
    useEffect(() => {
        isLockedRef.current = isLocked;
    }, [isLocked]);

    const swipeRef = useRef({
        active: false,
        triggered: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        startPoint: null,
        normal: null,
        plane: null,
        cubiePos: null
    });

    useEffect(() => {
        if (!enableSwipe || (size !== 2 && size !== 3)) return;

        const domElement = gl.domElement;
        const raycaster = new THREE.Raycaster();

        const getNdc = (clientX, clientY) => {
            const rect = domElement.getBoundingClientRect();
            return new THREE.Vector2(
                ((clientX - rect.left) / rect.width) * 2 - 1,
                -((clientY - rect.top) / rect.height) * 2 + 1
            );
        };

        const lockCameraControls = () => {
            domElement.dataset.swipingCube = 'true';
            if (controlsRef?.current) {
                controlsRef.current.enabled = false;
            }
        };

        const unlockCameraControls = () => {
            delete domElement.dataset.swipingCube;
            if (controlsRef?.current) {
                controlsRef.current.enabled = !isLockedRef.current;
            }
        };

        const onPointerDown = (e) => {
            if (!e.isPrimary) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (!cubeGroupRef.current) return;

            const ndc = getNdc(e.clientX, e.clientY);
            raycaster.setFromCamera(ndc, camera);
            const hits = raycaster.intersectObject(cubeGroupRef.current, true);

            if (hits.length === 0) {
                return;
            }

            // Bloque totalement TrackballControls / CustomLockControls dès qu'on touche le cube
            e.stopImmediatePropagation();
            if (e.cancelable) e.preventDefault();
            lockCameraControls();

            try {
                domElement.setPointerCapture(e.pointerId);
            } catch {
                // Ignore si non supporté
            }

            const hit = hits[0];
            const cubiePos = hit.object?.userData?.cubiePosition;
            if (!cubiePos) {
                swipeRef.current = {
                    active: true,
                    triggered: true,
                    pointerId: e.pointerId,
                    startX: e.clientX,
                    startY: e.clientY,
                    startPoint: null,
                    normal: null,
                    plane: null,
                    cubiePos: null
                };
                return;
            }

            const outer = (size - 1) / 2;
            const rawNormal = hit.face
                ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
                : hit.point.clone().normalize();

            const nx = Math.abs(rawNormal.x);
            const ny = Math.abs(rawNormal.y);
            const nz = Math.abs(rawNormal.z);

            let normal = new THREE.Vector3(
                nx >= ny && nx >= nz ? Math.sign(rawNormal.x) : 0,
                ny > nx && ny >= nz ? Math.sign(rawNormal.y) : 0,
                nz > nx && nz > ny ? Math.sign(rawNormal.z) : 0
            );

            // Vérifie que la normale pointe bien vers une face extérieure du cube
            const dotOuter =
                cubiePos[0] * normal.x + cubiePos[1] * normal.y + cubiePos[2] * normal.z;
            if (Math.abs(dotOuter - outer) > 0.15) {
                const localPt = cubeGroupRef.current.worldToLocal(hit.point.clone());
                const px = Math.abs(localPt.x);
                const py = Math.abs(localPt.y);
                const pz = Math.abs(localPt.z);
                normal = new THREE.Vector3(
                    px >= py && px >= pz ? Math.sign(localPt.x) : 0,
                    py > px && py >= pz ? Math.sign(localPt.y) : 0,
                    pz > px && pz > py ? Math.sign(localPt.z) : 0
                );
            }

            swipeRef.current = {
                active: true,
                triggered: false,
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                startPoint: hit.point.clone(),
                normal,
                plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, hit.point),
                cubiePos: [...cubiePos]
            };
        };

        const onPointerMove = (e) => {
            if (!swipeRef.current.active || e.pointerId !== swipeRef.current.pointerId) return;
            e.stopImmediatePropagation();
            if (e.cancelable) e.preventDefault();
            lockCameraControls();

            if (swipeRef.current.triggered || activeRotationRef.current !== null) return;

            const dx = e.clientX - swipeRef.current.startX;
            const dy = e.clientY - swipeRef.current.startY;
            if (Math.hypot(dx, dy) < 14) return;

            const { normal, plane, startPoint, cubiePos } = swipeRef.current;
            if (!normal || !plane || !startPoint || !cubiePos) return;

            const ndc = getNdc(e.clientX, e.clientY);
            raycaster.setFromCamera(ndc, camera);

            const intersectPoint = new THREE.Vector3();
            let delta = null;

            if (
                Math.abs(raycaster.ray.direction.dot(normal)) > 0.15 &&
                raycaster.ray.intersectPlane(plane, intersectPoint)
            ) {
                delta = intersectPoint.sub(startPoint);
            } else {
                const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
                const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
                delta = camRight.multiplyScalar(dx).addScaledVector(camUp, -dy);
            }

            // Projette strictement dans le plan de la face touchée
            delta.addScaledVector(normal, -delta.dot(normal));
            if (delta.lengthSq() < 1e-4) return;

            const ax = Math.abs(delta.x);
            const ay = Math.abs(delta.y);
            const az = Math.abs(delta.z);

            const swipeDir = new THREE.Vector3(
                ax >= ay && ax >= az ? Math.sign(delta.x) : 0,
                ay > ax && ay >= az ? Math.sign(delta.y) : 0,
                az > ax && az > ay ? Math.sign(delta.z) : 0
            );

            const rotVec = new THREE.Vector3().crossVectors(normal, swipeDir);
            let rotAxis = 'x';
            let rotSign = 1;

            if (Math.abs(rotVec.x) > 0.5) {
                rotAxis = 'x';
                rotSign = Math.sign(rotVec.x);
            } else if (Math.abs(rotVec.y) > 0.5) {
                rotAxis = 'y';
                rotSign = Math.sign(rotVec.y);
            } else if (Math.abs(rotVec.z) > 0.5) {
                rotAxis = 'z';
                rotSign = Math.sign(rotVec.z);
            } else {
                return;
            }

            const axisIdx = DICO_AXIS[rotAxis];
            const sliceVal = Math.round(cubiePos[axisIdx] * 2) / 2;
            const direction = -rotSign;

            swipeRef.current.triggered = true;
            onSwipeMoveRef.current?.(rotAxis, [sliceVal], direction);
        };

        const finishSwipe = (e) => {
            if (!swipeRef.current.active) return;
            if (e.pointerId !== undefined && e.pointerId !== swipeRef.current.pointerId) return;
            e.stopImmediatePropagation();
            try {
                if (e.pointerId !== undefined && domElement.hasPointerCapture(e.pointerId)) {
                    domElement.releasePointerCapture(e.pointerId);
                }
            } catch {
                // Ignore
            }
            swipeRef.current.active = false;
            unlockCameraControls();
        };

        // Bloque aussi les événements touch natifs écoutés par TrackballControls sur mobile
        const onTouchStart = (e) => {
            if (swipeRef.current.active) {
                e.stopImmediatePropagation();
                if (e.cancelable) e.preventDefault();
                lockCameraControls();
                return;
            }
            if (!e.touches || e.touches.length === 0 || !cubeGroupRef.current) return;
            const touch = e.touches[0];
            const ndc = getNdc(touch.clientX, touch.clientY);
            raycaster.setFromCamera(ndc, camera);
            const hits = raycaster.intersectObject(cubeGroupRef.current, true);
            if (hits.length > 0) {
                e.stopImmediatePropagation();
                if (e.cancelable) e.preventDefault();
                lockCameraControls();
            }
        };

        const onTouchMove = (e) => {
            if (!swipeRef.current.active) return;
            e.stopImmediatePropagation();
            if (e.cancelable) e.preventDefault();
            lockCameraControls();
        };

        const onTouchEnd = (e) => {
            if (!swipeRef.current.active) return;
            e.stopImmediatePropagation();
            swipeRef.current.active = false;
            unlockCameraControls();
        };

        domElement.addEventListener('pointerdown', onPointerDown, { capture: true, passive: false });
        domElement.addEventListener('touchstart', onTouchStart, { capture: true, passive: false });
        window.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
        window.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
        window.addEventListener('pointerup', finishSwipe, { capture: true });
        window.addEventListener('pointercancel', finishSwipe, { capture: true });
        window.addEventListener('touchend', onTouchEnd, { capture: true });
        window.addEventListener('touchcancel', onTouchEnd, { capture: true });

        return () => {
            domElement.removeEventListener('pointerdown', onPointerDown, { capture: true });
            domElement.removeEventListener('touchstart', onTouchStart, { capture: true });
            window.removeEventListener('pointermove', onPointerMove, { capture: true });
            window.removeEventListener('touchmove', onTouchMove, { capture: true });
            window.removeEventListener('pointerup', finishSwipe, { capture: true });
            window.removeEventListener('pointercancel', finishSwipe, { capture: true });
            window.removeEventListener('touchend', onTouchEnd, { capture: true });
            window.removeEventListener('touchcancel', onTouchEnd, { capture: true });
            unlockCameraControls();
        };
    }, [enableSwipe, size, camera, gl, controlsRef]);

    useLayoutEffect(() => {
        currentAngle.current = 0;
        committedRef.current = false;
        Object.values(pivotRefs.current).forEach(grp => {
            if (grp) grp.rotation.set(0, 0, 0);
        });
    }, [cubiesData, activeRotation]);

    useFrame((_, delta) => {
        if (activeRotation !== null && !committedRef.current) {
            currentAngle.current += turnSpeed * delta;
            const targetAngle = Math.PI / 2;
            const clampedAngle = Math.min(currentAngle.current, targetAngle);
            const rotValue = clampedAngle * -activeRotation.direction;

            for (const c of cubiesData) {
                const grp = pivotRefs.current[c.id];
                if (!grp) continue;
                const isMoving = activeRotation.value.some(
                    v => Math.abs(c.position[DICO_AXIS[activeRotation.axis]] - v) < 0.1
                );
                if (isMoving) {
                    grp.rotation[activeRotation.axis] = rotValue;
                } else {
                    grp.rotation.set(0, 0, 0);
                }
            }

            if (currentAngle.current >= targetAngle) {
                committedRef.current = true;
                commitRotation(activeRotation.axis, activeRotation.value, activeRotation.direction);
            }
        }
    });

    return (
        <group ref={cubeGroupRef} scale={cubeScale}>
            {cubiesData.map(data => (
                <group
                    key={data.id}
                    ref={el => {
                        pivotRefs.current[data.id] = el;
                    }}
                >
                    <Cubie
                        position={data.position}
                        initialPosition={data.initialPosition}
                        rotation={data.rotation}
                        faceColors={data.faceColors}
                    />
                </group>
            ))}
        </group>
    );
}
