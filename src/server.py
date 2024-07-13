import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import logging
import sys
import traceback

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Connect to MongoDB
try:
    client = MongoClient('mongodb://localhost:27017/')
    db = client['pool_degen']
    tasks_collection = db['tasks']
    user_scores_collection = db['user_scores']
    logger.info("Connected to MongoDB successfully")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    raise

@app.route('/')
def index():
    return jsonify({"message": "Hello, World!"})

@app.route('/api/save_score', methods=['POST'])
def save_score_endpoint():
    try:
        data = request.json
        username = data.get('username')
        score = data.get('score')
        timestamp = datetime.now()

        if username is None or score is None:
            return jsonify({'error': 'Invalid data'}), 400

        user_scores_collection.update_one(
            {'username': username},
            {'$inc': {'score': int(score), 'weekly_score': int(score)}, '$push': {'scores': {'score': int(score), 'timestamp': timestamp}}},
            upsert=True
        )
        return jsonify({'message': 'Score saved successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/get_user_score', methods=['GET'])
def get_user_score():
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Invalid data'}), 400

        user = user_scores_collection.find_one({'username': username})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        score = user.get('score', 0)
        weekly_score = user.get('weekly_score', 0)
        return jsonify({'score': score, 'weekly_score': weekly_score}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/add_task', methods=['POST'])
def add_task():
    try:
        data = request.json
        description = data.get('description')
        link = data.get('link')
        score = data.get('score')
        icon = data.get('icon')
        
        logger.info(f"Received task: description={description}, link={link}, score={score}, icon={icon}")
        
        task = {
            'description': description,
            'link': link,
            'score': int(score),
            'icon': icon,
            'status': 'active'
        }
        
        result = tasks_collection.insert_one(task)
        logger.info(f"Task added successfully: {result.inserted_id}")
        
        return jsonify({'message': 'Task added successfully', 'task_id': str(result.inserted_id)}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/api/get_tasks', methods=['GET'])
def get_tasks():
    try:
        tasks = list(tasks_collection.find())
        for task in tasks:
            task['_id'] = str(task['_id'])
        return jsonify(tasks), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/update_task/<task_id>', methods=['PUT'])
def update_task(task_id):
    try:
        data = request.json
        description = data.get('description')
        link = data.get('link')
        score = data.get('score')
        icon = data.get('icon')
        
        task = tasks_collection.find_one({'_id': ObjectId(task_id)})
        if not task:
            return jsonify({'error': 'Task not found'}), 404

        update_data = {
            'description': description,
            'link': link,
            'score': int(score),
            'icon': icon
        }

        result = tasks_collection.update_one(
            {'_id': ObjectId(task_id)},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'message': 'No changes made to the task'}), 200
        
        return jsonify({'message': 'Task updated successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/api/delete_task/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        result = tasks_collection.delete_one({'_id': ObjectId(task_id)})
        if result.deleted_count == 0:
            return jsonify({'error': 'Task not found'}), 404
        return jsonify({'message': 'Task deleted successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/complete_task', methods=['POST'])
def complete_task():
    try:
        data = request.json
        username = data.get('username')
        task_id = data.get('task_id')
        evidence_url = data.get('evidence_url')
        
        if not username or not task_id or not evidence_url:
            return jsonify({'error': 'Missing required data'}), 400
        
        # Update the database with the task completion and evidence URL
        user_scores_collection.update_one(
            {'username': username},
            {
                '$push': {
                    'task_states': {
                        'task_id': ObjectId(task_id),
                        'status': 'validating',
                        'evidence': evidence_url
                    }
                }
            },
            upsert=True
        )
        return jsonify({'message': 'Task submitted for validation', 'evidence_url': evidence_url}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/api/get_task_states', methods=['GET'])
def get_task_states():
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({'error': 'Invalid data'}), 400

        user = user_scores_collection.find_one({'username': username})
        task_states = user.get('task_states', []) if user else []
        
        # Convert ObjectId to string for JSON serialization
        for state in task_states:
            state['task_id'] = str(state['task_id'])
        
        return jsonify({'taskStates': task_states}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/get_pending_tasks', methods=['GET'])
def get_pending_tasks():
    try:
        logger.info("Fetching pending tasks")
        pending_tasks = list(user_scores_collection.find(
            {'task_states.status': 'validating'},
            {'username': 1, 'task_states.$': 1}
        ))
        
        formatted_tasks = []
        for user in pending_tasks:
            task = user['task_states'][0]
            formatted_tasks.append({
                'username': user['username'],
                'taskId': str(task['task_id']),
                'evidenceUrl': task['evidence']
            })
        
        logger.info(f"Fetched {len(formatted_tasks)} pending tasks")
        return jsonify(formatted_tasks), 200
    except Exception as e:
        logger.error(f"Error occurred in get_pending_tasks: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/api/approve_task', methods=['POST'])
def approve_task():
    try:
        data = request.json
        task_id = data.get('taskId')
        username = data.get('username')
        
        result = user_scores_collection.update_one(
            {'username': username, 'task_states.task_id': ObjectId(task_id)},
            {'$set': {'task_states.$.status': 'approved'}}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Task not found or already approved'}), 404
        
        return jsonify({'message': 'Task approved successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/reject_task', methods=['POST'])
def reject_task():
    try:
        data = request.json
        task_id = data.get('taskId')
        username = data.get('username')
        
        result = user_scores_collection.update_one(
            {'username': username, 'task_states.task_id': ObjectId(task_id)},
            {'$set': {'task_states.$.status': 'rejected'}}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Task not found or already rejected'}), 404
        
        return jsonify({'message': 'Task rejected successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/claim_reward', methods=['POST'])
def claim_reward():
    try:
        data = request.json
        username = data.get('username')
        task_id = data.get('task_id')
        score = data.get('score')
        
        user = user_scores_collection.find_one({'username': username})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        task_state = next((state for state in user.get('task_states', []) if str(state['task_id']) == task_id), None)
        if not task_state or task_state['status'] != 'approved':
            return jsonify({'error': 'Task not approved or already claimed'}), 400
        
        result = user_scores_collection.update_one(
            {'username': username, 'task_states.task_id': ObjectId(task_id)},
            {
                '$inc': {'score': score},
                '$set': {'task_states.$.status': 'claimed'},
                '$push': {'scores': {'score': score, 'timestamp': datetime.now()}}
            }
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Failed to claim reward'}), 500
        
        return jsonify({'message': 'Reward claimed successfully'}), 200
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5006, debug=True)