import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Pedometer, Accelerometer } from 'expo-sensors';
import { Ionicons, Feather } from '@expo/vector-icons';

export default function CardPassos() {
    const [passos, setPassos] = useState(0);
    const [ativo, setAtivo] = useState(false);
    const [tipoSensor, setTipoSensor] = useState('verificando'); // 'pedometer' | 'accelerometer'
    const [subscription, setSubscription] = useState(null);
    const [mensagem, setMensagem] = useState('');

    // Referências para o algoritmo de contagem de passos via acelerômetro
    const lastStepTime = useRef(0);
    const wasAboveThreshold = useRef(false);

    useEffect(() => {
        // Detecta se o aparelho possui chip dedicado ou se usará o Acelerômetro (ex: Edge 30 Neo)
        async function detectarMelhorSensor() {
            try {
                const pedometerDisponivel = await Pedometer.isAvailableAsync();

                if (pedometerDisponivel) {
                    if (Pedometer.getPermissionsAsync) {
                        const perm = await Pedometer.getPermissionsAsync();
                        if (perm.granted) {
                            setTipoSensor('pedometer');
                            return;
                        } else {
                            setTipoSensor('pedometer');
                            return;
                        }
                    }
                    setTipoSensor('accelerometer');
                } catch {
                    setTipoSensor('accelerometer');
                }
            }

    detectarMelhorSensor();

            return () => {
                if (subscription) {
                    subscription.remove();
                }
            };
        }, [subscription]);

    function iniciarComAcelerometro() {
        try {
            setTipoSensor('accelerometer');
            setMensagem('');
            Accelerometer.setUpdateInterval(50); // 50ms para capturar o impacto exato

            const novaSubscricao = Accelerometer.addListener((data) => {
                const { x, y, z } = data;
                const magnitude = Math.sqrt(x * x + y * y + z * z);
                const now = Date.now();

                const LIMIAR_PASSO = 1.18;
                const INTERVALO_MINIMO = 260;

                if (magnitude > LIMIAR_PASSO && !wasAboveThreshold.current) {
                    if (now - lastStepTime.current > INTERVALO_MINIMO) {
                        wasAboveThreshold.current = true;
                        lastStepTime.current = now;
                        setPassos((prev) => prev + 1);
                    }
                } else if (magnitude < 1.10 || now - lastStepTime.current > 350) {
                    wasAboveThreshold.current = false;
                }
            });

            setSubscription(novaSubscricao);
            setAtivo(true);
        } catch (error) {
            console.log(error);
            setMensagem('Não foi possível iniciar o acelerômetro.');
        }
    }

    async function alternarContador() {
        if (ativo) {
            if (subscription) {
                subscription.remove();
                setSubscription(null);
            }
            setAtivo(false);
            return;
        }

        setMensagem('');

        if (tipoSensor === 'pedometer') {
            try {
                if (Pedometer.requestPermissionsAsync) {
                    const permissao = await Pedometer.requestPermissionsAsync();
                    if (!permissao.granted) {
                        iniciarComAcelerometro();
                        return;
                    }
                }

                const novaSubscricao = Pedometer.watchStepCount((result) => {
                    setPassos(result.steps);
                });

                setSubscription(novaSubscricao);
                setAtivo(true);
                return;
            } catch {
                iniciarComAcelerometro();
                return;
            }
        }

        iniciarComAcelerometro();
    }

    function zerarPassos() {
        setPassos(0);
    }

    // Cálculo da porcentagem da meta de 10.000 passos
    const porcentagemMeta = Math.min((passos / 10000) * 100, 100);

    return (
        <View style={styles.card}>
            {/* Cabeçalho do Card */}
            <View style={styles.cardHeader}>
                <View style={styles.cardTituloWrapper}>
                    <View style={styles.iconBadgeVerde}>
                        <Feather name="zap" size={17} color="#10B981" />
                    </View>
                    <Text style={styles.cardTitulo}>Contador de Passos</Text>
                </View>

                <Text style={styles.metaTexto}>Meta: 10.000</Text>
            </View>

            {/* Contagem Principal */}
            <View style={styles.centroContainer}>
                <Text style={styles.dadoLabel}>PASSOS REALIZADOS</Text>
                <Text style={styles.passosDestaque}>{passos}</Text>
                <Text style={styles.passosSubtexto}>passos</Text>
            </View>

            {/* Barra de Progresso */}
            <View style={styles.progressTrack}>
                <View
                    style={[
                        styles.progressBar,
                        { width: ${ Math.max(porcentagemMeta, 3) } % },
    ]}
  />
            </View>

            {/* Status do Sensor em Pílula */}
            <View style={styles.statusPill}>
                {tipoSensor === 'accelerometer' ? (
                    <>
                        <Feather
                            name="zap"
                            size={13}
                            color="#F59E0B"
                            style={styles.pillIconLeft}
                        />
                        <Text style={styles.statusPillTexto}>
                            Acelerômetro • Motorola Edge 30 Neo
                        </Text>
                        <Feather
                            name="check"
                            size={13}
                            color="#10B981"
                            style={styles.pillIconRight}
                        />
                    </>
                ) : tipoSensor === 'pedometer' ? (
                    <>
                        <Ionicons
                            name="footsteps"
                            size={13}
                            color="#10B981"
                            style={styles.pillIconLeft}
                        />
                        <Text style={styles.statusPillTexto}>
                            Pedômetro Nativo • Hardware
                        </Text>
                        <Feather
                            name="check"
                            size={13}
                            color="#10B981"
                            style={styles.pillIconRight}
                        />
                    </>
                ) : (
                    <Text style={styles.statusPillTexto}>Identificando sensor...</Text>
                )}
            </View>

            {mensagem ? <Text style={styles.mensagemAlerta}>{mensagem}</Text> : null}

            {/* Botão de Ação: Iniciar / Parar */}
            <Pressable
                style={({ pressed }) => [
                    styles.botao,
                    ativo ? styles.botaoVermelho : styles.botaoVerde,
                    pressed && styles.botaoPressionado,
                ]}
                onPress={alternarContador}
                {ativo ? (
                    <Ionicons
                        name="square"
                        size={14}
                        color="#FFFFFF"
                        style={styles.btnIcon}
                    />
                ) : (
                    <Ionicons
                        name="play"
                        size={15}
                        color="#FFFFFF"
                        style={styles.btnIcon}
                    />
                )}
  <Text style={styles.textoBotao}>
                {ativo ? 'Parar contador' : 'Iniciar contador'}
            </Text>
        </Pressable>

{/* Botão para Zerar */ }
    { passos > 0 && !ativo ? (